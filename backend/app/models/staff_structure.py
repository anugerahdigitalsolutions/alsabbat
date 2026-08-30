"""Master Bagian (department) & Jabatan (position) Staff — satu sumber data.

Additive terhadap struktur Staff existing:
- `role` (StaffRole) & `role_label` lama TETAP dipertahankan untuk data Staff lama.
- `role` kini diturunkan otomatis dari Jabatan yang dipilih (mapping di bawah,
  fallback `OTHER`) sehingga form baru tidak perlu menampilkan field `role`.
Dipakai oleh: model Staff, data pengajuan Staf, dan endpoint `/api/meta`.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.models.enums import StaffRole

STAFF_DEPARTMENTS: List[Dict[str, Any]] = [
    {
        "label": "Manajemen & Direksi",
        "positions": [
            "Presiden Klub",
            "Wakil Presiden",
            "Direktur Utama",
            "Direktur Operasional",
            "Direktur Teknik",
            "Sekretaris Klub",
            "Bendahara",
        ],
    },
    {
        "label": "Tim Teknis",
        "positions": [
            "Team Manager",
            "Pelatih Kepala",
            "Asisten Pelatih",
            "Pelatih Kiper",
            "Pelatih Fisik",
            "Analis Pertandingan",
            "Scout",
        ],
    },
    {
        "label": "Medis",
        "positions": [
            "Dokter Tim",
            "Fisioterapis",
            "Terapis",
        ],
    },
    {
        "label": "Media, Sosial & Marketing",
        "positions": [
            "Head of Media",
            "Social Media Manager",
            "Social Media Specialist",
            "Content Creator",
            "Graphic Designer",
            "Fotografer",
            "Videografer",
            "Editor Video",
            "Media Officer",
            "Marketing Manager",
            "Marketing Staff",
            "Sponsorship Manager",
            "Public Relations / PR",
        ],
    },
    {
        "label": "IT & Developer",
        "positions": [
            "IT Manager",
            "System Administrator",
            "Web Developer",
            "Mobile Developer",
            "Backend Developer",
            "Frontend Developer",
            "Full Stack Developer",
            "UI/UX Designer",
            "Database Administrator",
            "IT Support",
        ],
    },
    {
        "label": "Operasional & Pendukung",
        "positions": [
            "Kit Manager",
            "Equipment Manager",
            "Liaison Officer",
            "Security/Matchday Officer",
            "Admin Klub",
        ],
    },
]

POSITIONS_BY_DEPARTMENT: Dict[str, List[str]] = {
    item["label"]: list(item["positions"]) for item in STAFF_DEPARTMENTS
}
ALL_POSITIONS: List[str] = [pos for item in STAFF_DEPARTMENTS for pos in item["positions"]]

# Jabatan → `role` lama (backward compatibility). Sisanya OTHER.
POSITION_ROLE_MAP: Dict[str, StaffRole] = {
    "Pelatih Kepala": StaffRole.HEAD_COACH,
    "Asisten Pelatih": StaffRole.ASSISTANT_COACH,
    "Pelatih Kiper": StaffRole.GOALKEEPER_COACH,
    "Pelatih Fisik": StaffRole.FITNESS_COACH,
    "Team Manager": StaffRole.TEAM_MANAGER,
    "Analis Pertandingan": StaffRole.ANALYST,
    "Dokter Tim": StaffRole.MEDICAL_STAFF,
    "Fisioterapis": StaffRole.MEDICAL_STAFF,
    "Terapis": StaffRole.MEDICAL_STAFF,
    "Kit Manager": StaffRole.KIT_MANAGER,
    "Equipment Manager": StaffRole.KIT_MANAGER,
}


def role_for_position(position: Optional[str]) -> Optional[str]:
    """`role` lama yang sepadan dengan Jabatan (fallback OTHER)."""
    if not position:
        return None
    return POSITION_ROLE_MAP.get(position.strip(), StaffRole.OTHER).value


def meta_departments() -> List[Dict[str, Any]]:
    """Bentuk yang dipakai dropdown dependent di UI (value = label)."""
    return [
        {"value": item["label"], "label": item["label"], "positions": list(item["positions"])}
        for item in STAFF_DEPARTMENTS
    ]


def normalise_staff_structure(data: Any) -> Any:
    """Validasi Bagian/Jabatan + turunkan `role` lama dari Jabatan.

    Dipakai sebagai model validator (mode="before") pada Staff dan data
    pengajuan Staf. Field kosong/tidak dikirim tidak diubah → data lama aman.
    """
    if not isinstance(data, dict):
        return data
    if "department" not in data and "position_title" not in data:
        return data

    department = data.get("department")
    position = data.get("position_title")
    if isinstance(department, str):
        department = department.strip() or None
    if isinstance(position, str):
        position = position.strip() or None

    if department and department not in POSITIONS_BY_DEPARTMENT:
        raise ValueError(f"Bagian tidak dikenal: {department}")
    if position:
        allowed = POSITIONS_BY_DEPARTMENT.get(department) if department else ALL_POSITIONS
        if position not in allowed:
            raise ValueError(
                f"Jabatan '{position}' tidak tersedia pada bagian "
                f"'{department or 'yang dipilih'}'."
            )

    patched = {**data, "department": department, "position_title": position}
    if position:
        patched["role"] = role_for_position(position)
    return patched
