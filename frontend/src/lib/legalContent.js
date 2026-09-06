/**
 * Dokumen legal AL SABBAT untuk website resmi (Syarat & Ketentuan, Kebijakan
 * Privasi, penghapusan akun). Isi identik dengan dokumen di aplikasi mobile
 * (`mobile/src/lib/legal.js`).
 */
export const LEGAL_UPDATED_AT = '8 Juni 2026';

export const TERMS = {
  key: 'terms',
  title: 'Syarat & Ketentuan',
  heading: 'Syarat & Ketentuan AL SABBAT Football Club',
  intro:
    'Dokumen ini mengatur penggunaan aplikasi dan layanan digital AL SABBAT Football Club. ' +
    'Dokumen ini merupakan syarat & ketentuan penggunaan aplikasi, bukan nasihat hukum.',
  sections: [
    {
      title: '1. Penerimaan Ketentuan',
      body: [
        'Dengan mendaftar dan menggunakan aplikasi AL SABBAT, pengguna menyatakan telah membaca, memahami, dan menyetujui Syarat & Ketentuan ini.',
      ],
    },
    {
      title: '2. Tentang Layanan',
      body: [
        'Aplikasi AL SABBAT menyediakan informasi dan layanan digital terkait AL SABBAT Football Club, termasuk informasi klub, pertandingan, berita, media, profil pengguna/member, pengajuan Player/Staff, kartu member, notifikasi, serta fitur lain yang tersedia di aplikasi.',
      ],
    },
    {
      title: '3. Akun Pengguna',
      body: [
        'Pengguna bertanggung jawab menjaga keamanan akun dan informasi autentikasi miliknya.',
        'Pengguna wajib memberikan informasi yang benar, akurat, dan tidak menyesatkan.',
        'Satu akun tidak boleh digunakan untuk melakukan tindakan yang melanggar hukum atau merugikan pihak lain.',
      ],
    },
    {
      title: '4. Penggunaan yang Dilarang',
      body: ['Pengguna dilarang:'],
      bullets: [
        'menggunakan aplikasi untuk tindakan ilegal;',
        'memberikan informasi palsu atau menggunakan identitas orang lain;',
        'mencoba mengakses akun/data pengguna lain;',
        'mengganggu keamanan atau operasional sistem;',
        'melakukan penyalahgunaan fitur aplikasi;',
        'mengunggah konten yang melanggar hukum, hak orang lain, atau ketentuan platform;',
        'melakukan tindakan yang dapat merusak reputasi atau operasional AL SABBAT.',
      ],
    },
    {
      title: '5. Player / Staff Application',
      body: [
        'Pengajuan Player atau Staff harus menggunakan data yang benar.',
        'Pengajuan dapat diperiksa dan diproses oleh pihak AL SABBAT.',
        'Pengajuan tidak otomatis berarti diterima.',
        'Keputusan persetujuan atau penolakan berada pada pihak AL SABBAT sesuai proses internal yang berlaku.',
      ],
    },
    {
      title: '6. Foto dan Konten Pengguna',
      body: [
        'Jika pengguna mengunggah foto atau data melalui aplikasi, pengguna bertanggung jawab memastikan bahwa pengguna memiliki hak untuk mengunggahnya dan konten tersebut tidak melanggar hukum atau hak pihak lain.',
      ],
    },
    {
      title: '7. Member Card dan QR',
      body: [
        'Member Card dan QR Code hanya boleh digunakan oleh pemilik akun yang sah.',
        'Penggunaan QR atau Member Card secara tidak sah, manipulatif, atau untuk memalsukan identitas dilarang.',
      ],
    },
    {
      title: '8. Notifikasi',
      body: [
        'Aplikasi dapat mengirimkan notifikasi terkait akun, pengajuan Player/Staff, informasi pertandingan, dan informasi layanan lainnya sesuai fitur yang tersedia.',
      ],
    },
    {
      title: '9. Ketersediaan Layanan',
      body: [
        'AL SABBAT berupaya menjaga layanan tetap tersedia dan berfungsi dengan baik, namun tidak menjamin layanan selalu bebas dari gangguan, kesalahan teknis, atau penghentian sementara.',
      ],
    },
    {
      title: '10. Perubahan Layanan',
      body: [
        'AL SABBAT dapat memperbarui, mengubah, menambah, atau menghentikan fitur tertentu apabila diperlukan untuk pengembangan, keamanan, operasional, atau kepatuhan.',
      ],
    },
    {
      title: '11. Privasi dan Data',
      body: [
        'Penggunaan data pribadi pengguna dijelaskan dalam Kebijakan Privasi AL SABBAT.',
        'Pengguna dapat menggunakan fitur penghapusan akun sesuai mekanisme yang tersedia.',
      ],
    },
    {
      title: '12. Penghapusan Akun',
      body: [
        'Pengguna dapat meminta penghapusan akun melalui fitur "Hapus Akun" di dalam aplikasi (Profile → Pengaturan Akun → Hapus Akun) atau melalui halaman resmi /hapus-akun pada website ini.',
        'Penghapusan akun akan memproses penghapusan akun dan data pribadi terkait sesuai kebijakan penghapusan data AL SABBAT.',
        'Data tertentu dapat dipertahankan apabila terdapat kewajiban hukum, keamanan, pencegahan penipuan, atau alasan sah lainnya. Rincian data yang dipertahankan dijelaskan pada Kebijakan Privasi.',
      ],
    },
    {
      title: '13. Perubahan Syarat & Ketentuan',
      body: [
        'AL SABBAT dapat memperbarui Syarat & Ketentuan ini dari waktu ke waktu.',
        'Versi terbaru akan tersedia melalui aplikasi/website.',
      ],
    },
    {
      title: '14. Kontak',
      body: [
        'Untuk pertanyaan mengenai layanan, akun, privasi, atau penghapusan data, pengguna dapat menghubungi kontak resmi AL SABBAT yang tersedia pada halaman Kontak website ini dan pada aplikasi.',
      ],
    },
  ],
};

export const PRIVACY = {
  key: 'privacy',
  title: 'Kebijakan Privasi',
  heading: 'Kebijakan Privasi AL SABBAT Football Club',
  intro:
    'Kebijakan ini menjelaskan data pengguna yang diproses aplikasi dan website AL SABBAT, tujuan ' +
    'pemrosesannya, serta cara pengguna menghapus akun dan data pribadinya.',
  sections: [
    {
      title: '1. Data yang Diproses',
      body: ['AL SABBAT hanya memproses data yang diperlukan untuk menjalankan fitur layanan:'],
      bullets: [
        'Data akun: nama lengkap, email, nomor WhatsApp, kata sandi (disimpan dalam bentuk hash), status verifikasi email, nomor & kode member.',
        'Data pengajuan Player/Staff: data yang Anda isi sendiri pada formulir pengajuan beserta foto yang Anda unggah.',
        'Data perangkat untuk notifikasi: token push perangkat, platform, dan versi aplikasi.',
        'Data aktivitas layanan: sesi login, notifikasi akun, serta pesanan merchandise bila Anda melakukan pembelian.',
      ],
    },
    {
      title: '2. Tujuan Pemrosesan',
      body: [
        'Data digunakan untuk autentikasi akun, penerbitan kartu member digital dan QR verifikasi, pemrosesan pengajuan Player/Staff oleh pengurus klub, pengiriman notifikasi layanan, serta keamanan dan pencegahan penyalahgunaan.',
      ],
    },
    {
      title: '3. Berbagi Data',
      body: [
        'AL SABBAT tidak menjual data pengguna. Data hanya diproses oleh pengurus klub yang berwenang serta penyedia layanan teknis yang dipakai layanan (penyimpanan media, layanan email, dan layanan pengiriman notifikasi).',
      ],
    },
    {
      title: '4. Penghapusan Akun',
      body: [
        'Anda dapat menghapus akun kapan saja langsung dari aplikasi: Profile → Pengaturan Akun → Hapus Akun. Permintaan yang sama juga dapat dilakukan tanpa aplikasi melalui halaman /hapus-akun pada website ini.',
        'Penghapusan bersifat permanen dan tidak dapat dibatalkan.',
      ],
    },
    {
      title: '5. Data yang Dihapus',
      body: ['Saat akun dihapus, data berikut dihapus permanen:'],
      bullets: [
        'dokumen akun (nama, email, nomor WhatsApp, kata sandi, nomor & kode member);',
        'seluruh sesi login sehingga token lama langsung tidak berlaku;',
        'kode OTP dan token reset kata sandi milik akun;',
        'token notifikasi seluruh perangkat milik akun;',
        'notifikasi pribadi di dalam aplikasi;',
        'pengajuan Player/Staff milik akun beserta data pribadi di dalamnya;',
        'foto yang diunggah pengguna melalui aplikasi, kecuali foto yang masih dipakai pada profil Pemain/Staf resmi klub.',
      ],
    },
    {
      title: '6. Data yang Dipertahankan',
      body: [
        'Profil Pemain/Staf yang sudah disetujui merupakan data roster resmi klub yang dikelola pengurus, sehingga tetap dipertahankan; tautan ke akun pengguna dihapus.',
        'Catatan pesanan merchandise dipertahankan sebagai catatan transaksi, namun data pribadi di dalamnya (nama, email, telepon, penerima, dan alamat) dianonimkan.',
        'Data lain dapat dipertahankan hanya bila diwajibkan hukum, dibutuhkan untuk keamanan, atau pencegahan penipuan.',
      ],
    },
    {
      title: '7. Keamanan',
      body: [
        'Kata sandi disimpan dalam bentuk hash, OTP disimpan sebagai hash, dan akses data akun hanya dapat dilakukan oleh pemilik akun melalui sesi terautentikasi.',
      ],
    },
    {
      title: '8. Kontak',
      body: [
        'Pertanyaan mengenai privasi atau penghapusan data dapat disampaikan melalui kontak resmi AL SABBAT pada halaman Kontak website ini.',
      ],
    },
  ],
};

export const DELETION_REMOVED = [
  'Akun AL SABBAT: nama, email, nomor WhatsApp, kata sandi, nomor & kode member.',
  'Semua sesi login — token yang tersimpan langsung tidak berlaku.',
  'Kode OTP dan token reset kata sandi milik akun.',
  'Token notifikasi semua perangkat milik akun.',
  'Notifikasi pribadi di dalam aplikasi.',
  'Pengajuan Pemain/Staf milik akun beserta data pribadi di dalamnya.',
  'Foto yang diunggah melalui aplikasi (kecuali yang masih dipakai profil Pemain/Staf resmi klub).',
];

export const DELETION_RETAINED = [
  'Profil Pemain/Staf yang sudah disetujui tetap menjadi data roster resmi klub; tautan ke akun dihapus.',
  'Catatan pesanan merchandise dipertahankan sebagai catatan transaksi, tetapi data pribadi di dalamnya dianonimkan.',
  'Data lain hanya dipertahankan bila diwajibkan hukum, dibutuhkan untuk keamanan, atau pencegahan penipuan.',
];
