"""Penghapusan akun AL SABBAT (self-service, permanen).

Dipakai oleh `DELETE /api/baraya/me/account`. Identitas SELALU diambil dari
sesi terautentikasi — fungsi ini tidak pernah menerima id dari client.

Kebijakan (hasil audit struktur data existing):

DIHAPUS PERMANEN
  customers                  : dokumen akun (identitas, kontak, member number)
  customer_sessions          : semua sesi/token akun → token lama langsung mati
  customer_otps              : OTP berdasarkan email akun
  customer_password_resets   : token reset kata sandi akun
  customer_push_devices      : token push semua device milik akun
  notifications              : notifikasi pribadi (audience CUSTOMER)
  member_applications        : pengajuan Pemain/Staf milik akun (data pribadi:
                               alamat, tanggal lahir, motivasi, telepon)
  media                      : record media yang DIUNGGAH akun (uploaded_by
                               `baraya:{id}`) + berkasnya di storage, KECUALI
                               foto yang masih dipakai profil Pemain/Staf klub
                               (agar halaman publik klub tidak rusak)

DIPERTAHANKAN (bukan data akun, milik klub / kewajiban administratif)
  players / staff            : profil Pemain & Staf yang SUDAH disetujui adalah
                               data roster klub yang dikelola Admin Panel. Tidak
                               dihapus; tautan `customer_id` pada Staff Entry
                               DIHAPUS sehingga tidak ada lagi rujukan ke akun.
  orders                     : pesanan merchandise dipertahankan untuk catatan
                               transaksi, namun data pribadi di dalamnya
                               DIANONIMKAN (nama/email/telepon/penerima/alamat)
                               dan `customer_id` dilepas.
  data global (klub, pertandingan, berita, galeri, admin) tidak pernah disentuh.
"""
from __future__ import annotations

from typing import Any, Dict, List, Set

from fastapi.encoders import jsonable_encoder

from app.core.database import Collections, get_db
from app.core.logging_config import get_logger
from app.models.base import utcnow
from app.services.media_service import media_service

logger = get_logger(__name__)

ANONYMISED = "Akun dihapus"


async def _retained_photo_urls(db, customer: Dict[str, Any], applications: List[Dict[str, Any]]) -> Set[str]:
    """URL foto yang masih dipakai profil Pemain/Staf klub (tidak boleh dihapus)."""
    player_ids = {customer.get("player_id")}
    staff_ids = {customer.get("staff_id")}
    for app_doc in applications:
        player_ids.add(app_doc.get("player_id"))
        staff_ids.add(app_doc.get("staff_id"))
    player_ids.discard(None)
    staff_ids.discard(None)

    urls: Set[str] = set()
    query_pairs = (
        (Collections.PLAYERS, {"id": {"$in": list(player_ids)}} if player_ids else None),
        (Collections.STAFF, {"$or": [{"id": {"$in": list(staff_ids)}}, {"customer_id": customer["id"]}]}),
    )
    for collection, query in query_pairs:
        if query is None:
            continue
        async for doc in db[collection].find(query):
            if doc.get("photo"):
                urls.add(doc["photo"])
            for image in doc.get("gallery_images") or []:
                if image:
                    urls.add(image)
    return urls


async def delete_customer_account(customer_id: str) -> Dict[str, Any]:
    """Hapus akun + data pribadi terkait. Idempoten: akun yang sudah hilang
    tetap mengembalikan `success` tanpa error."""
    db = get_db()
    customer = await db[Collections.CUSTOMERS].find_one({"id": customer_id})
    if not customer:
        return {"success": True, "already_deleted": True, "deleted": {}, "retained": {}}

    email = (customer.get("email") or "").lower().strip()
    applications = await db[Collections.MEMBER_APPLICATIONS].find(
        {"customer_id": customer_id}
    ).to_list(length=200)
    retained_urls = await _retained_photo_urls(db, customer, applications)

    # --- media milik akun (record + berkas storage), kecuali yang masih dipakai
    media_deleted = 0
    media_retained = 0
    async for doc in db[Collections.MEDIA].find({"uploaded_by": f"baraya:{customer_id}"}):
        if doc.get("url") and doc["url"] in retained_urls:
            media_retained += 1
            continue
        try:
            await media_service.remove(doc.get("storage_key"))
        except Exception:  # storage boleh gagal: metadata tetap dihapus
            logger.warning("account_deletion.media_file_remove_failed media=%s", doc.get("id"))
        await db[Collections.MEDIA].delete_one({"id": doc["id"]})
        media_deleted += 1

    deleted: Dict[str, int] = {"media": media_deleted}
    hard_deletes = (
        ("push_devices", Collections.PUSH_DEVICES, {"customer_id": customer_id}),
        ("sessions", Collections.CUSTOMER_SESSIONS, {"customer_id": customer_id}),
        ("otps", Collections.CUSTOMER_OTPS, {"email": email}),
        ("password_resets", Collections.CUSTOMER_PASSWORD_RESETS, {"customer_id": customer_id}),
        (
            "notifications",
            Collections.NOTIFICATIONS,
            {"audience": "CUSTOMER", "recipient_id": customer_id},
        ),
        ("member_applications", Collections.MEMBER_APPLICATIONS, {"customer_id": customer_id}),
    )
    for label, collection, query in hard_deletes:
        result = await db[collection].delete_many(query)
        deleted[label] = result.deleted_count

    # --- Staff Entry klub: record tetap, tautan ke akun dilepas
    unlink = await db[Collections.STAFF].update_many(
        {"customer_id": customer_id}, {"$unset": {"customer_id": ""}}
    )

    # --- pesanan: catatan transaksi dipertahankan, data pribadi dianonimkan
    now = jsonable_encoder(utcnow())
    anonymised = await db[Collections.ORDERS].update_many(
        {"customer_id": customer_id},
        {
            "$set": {
                "customer_id": None,
                "customer.name": ANONYMISED,
                "customer.email": "",
                "customer.phone": "",
                "shipping.recipient": ANONYMISED,
                "shipping.address": ANONYMISED,
                "shipping.notes": None,
                "personal_data_removed_at": now,
                "updated_at": now,
            }
        },
    )

    await db[Collections.CUSTOMERS].delete_one({"id": customer_id})
    deleted["customer"] = 1

    retained = {
        "orders_anonymised": anonymised.modified_count,
        "club_staff_entries_unlinked": unlink.modified_count,
        "media_still_used_by_club_profile": media_retained,
    }
    logger.info(
        "baraya.account_deleted customer=%s deleted=%s retained=%s",
        customer_id,
        deleted,
        retained,
    )
    return {"success": True, "already_deleted": False, "deleted": deleted, "retained": retained}
