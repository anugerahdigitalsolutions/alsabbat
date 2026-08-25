{
  "meta": {
    "product": "ALSABBAT Football Club Digital Platform",
    "phase": "Phase 1 — Foundation (Public Shell + Admin Dashboard Foundation)",
    "visual_character": ["Football Club", "Modern", "Professional", "Premium", "Strong"],
    "non_goals_phase_1": ["e-commerce", "ticketing", "membership", "live match center", "social publishing"],
    "testing_requirement": {
      "rule": "All interactive and key informational elements MUST include data-testid",
      "convention": "kebab-case describing role (not appearance)",
      "examples": [
        "data-testid=\"public-header-primary-nav\"",
        "data-testid=\"admin-sidebar-nav-item-players\"",
        "data-testid=\"table-search-input\"",
        "data-testid=\"empty-state-primary-action\"",
        "data-testid=\"system-status-health-badge\""
      ]
    }
  },

  "brand_attributes": {
    "keywords": ["stadium energy", "badge/pride", "tactical clarity", "media-ready"],
    "design_principles": [
      "Ownable football identity: bold blocks, crest-like geometry, pitch-line motifs",
      "Premium restraint: minimal gradients, strong solids, crisp typography",
      "Information-first admin: dense but breathable tables, predictable patterns",
      "Mobile-first public: thumb-friendly nav + fast scanning cards"
    ]
  },

  "inspiration_refs": {
    "web": [
      {
        "title": "BSC Young Boys website (structure + football identity)",
        "url": "https://www.arillo.ch/en/projects/bsc-young-boys-website"
      },
      {
        "title": "Feyenoord identity refresh (premium sports branding cues)",
        "url": "https://www.itsnicethat.com/articles/studio-dumbar-dept-jacob-wise-feyenoord-graphic-design-project-010525"
      },
      {
        "title": "Admin dashboard patterns with shadcn (sidebar shells + tables)",
        "url": "https://adminlte.io/blog/build-admin-dashboard-shadcn-nextjs/"
      }
    ],
    "design_fusion": "Layout discipline from modern admin dashboards + football-club emotional hero treatment + Swiss-style grid + subtle brutalist blocks (strong borders, confident spacing)."
  },

  "design_tokens": {
    "implementation_notes": {
      "rule": "Never scatter hex values in components. Use CSS variables + Tailwind theme mapping.",
      "dynamic_branding": "Club identity comes from GET /api/club/active. UI should default to mandatory tokens but allow runtime override by setting CSS variables on :root (or [data-club-theme]).",
      "contrast_note": "#FCCF2B on white is low contrast. Use gold as accent/highlight, not as body text on light backgrounds. For CTAs, use gold background with dark text (#222222) OR gold border with dark fill."
    },

    "css_variables": {
      "brand": {
        "--club-primary": "#FCCF2B",
        "--club-secondary": "#012891",
        "--club-tertiary": "#222222",
        "--club-light": "#FEFEFE"
      },
      "semantic": {
        "--bg": "var(--club-light)",
        "--fg": "var(--club-tertiary)",
        "--surface": "#FFFFFF",
        "--surface-2": "#F7F7F8",
        "--surface-3": "#F1F2F4",

        "--border": "rgba(34,34,34,0.12)",
        "--border-strong": "rgba(34,34,34,0.22)",

        "--primary": "var(--club-primary)",
        "--primary-fg": "#1A1A1A",
        "--secondary": "var(--club-secondary)",
        "--secondary-fg": "#FFFFFF",

        "--muted": "#F3F4F6",
        "--muted-fg": "rgba(34,34,34,0.72)",

        "--focus-ring": "rgba(1,40,145,0.35)",
        "--shadow-color": "rgba(2, 6, 23, 0.18)",

        "--success": "#16A34A",
        "--warning": "#F59E0B",
        "--error": "#DC2626",
        "--info": "#0284C7"
      },
      "radius": {
        "--radius-sm": "10px",
        "--radius-md": "14px",
        "--radius-lg": "18px",
        "--radius-xl": "22px"
      },
      "spacing": {
        "--space-1": "4px",
        "--space-2": "8px",
        "--space-3": "12px",
        "--space-4": "16px",
        "--space-5": "20px",
        "--space-6": "24px",
        "--space-8": "32px",
        "--space-10": "40px",
        "--space-12": "48px"
      },
      "shadows": {
        "--shadow-sm": "0 1px 2px var(--shadow-color)",
        "--shadow-md": "0 10px 24px rgba(2, 6, 23, 0.10)",
        "--shadow-lg": "0 18px 50px rgba(2, 6, 23, 0.14)",
        "--shadow-inset": "inset 0 1px 0 rgba(255,255,255,0.55)"
      },
      "motion": {
        "--ease-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "--ease-in": "cubic-bezier(0.7, 0, 0.84, 0)",
        "--dur-1": "120ms",
        "--dur-2": "180ms",
        "--dur-3": "260ms"
      }
    },

    "tailwind_mapping_guidance": {
      "note": "Map shadcn tokens (HSL) to brand variables by converting to HSL OR use CSS variables directly in Tailwind config. Keep brand hex as source of truth.",
      "recommended": {
        "--background": "use --bg",
        "--foreground": "use --fg",
        "--primary": "use --primary",
        "--primary-foreground": "use --primary-fg",
        "--secondary": "use --secondary",
        "--secondary-foreground": "use --secondary-fg",
        "--border": "use --border",
        "--ring": "use --focus-ring"
      }
    },

    "texture_and_patterns": {
      "noise_overlay": {
        "usage": "Use subtle noise on hero + admin topbar only (not on reading-heavy tables).",
        "css": "background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"3\" stitchTiles=\"stitch\"/></filter><rect width=\"120\" height=\"120\" filter=\"url(%23n)\" opacity=\"0.06\"/></svg>');"
      },
      "pitch_line_motif": {
        "usage": "Decorative only: thin lines in hero background or section dividers.",
        "tailwind": "bg-[linear-gradient(to_right,rgba(254,254,254,0.08)_1px,transparent_1px)] bg-[length:48px_48px]"
      }
    },

    "gradients": {
      "rule": "Gradients must cover <20% viewport and never on text-heavy areas.",
      "allowed_mild_gradients": [
        {
          "name": "stadium-glow",
          "css": "radial-gradient(900px circle at 20% 10%, rgba(252,207,43,0.18), transparent 55%), radial-gradient(700px circle at 80% 0%, rgba(1,40,145,0.14), transparent 52%)",
          "usage": "Hero background overlay only"
        }
      ]
    }
  },

  "typography": {
    "google_fonts": {
      "display": {
        "name": "Space Grotesk",
        "weights": [500, 600, 700],
        "usage": "Headings, nav labels, stat numbers"
      },
      "body": {
        "name": "IBM Plex Sans",
        "weights": [400, 500, 600],
        "usage": "Body, forms, tables"
      },
      "mono_optional": {
        "name": "IBM Plex Mono",
        "weights": [400, 500],
        "usage": "IDs, system meta, technical labels"
      }
    },
    "scale_tailwind": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight",
      "h2": "text-base md:text-lg font-medium text-[color:var(--muted-fg)]",
      "h3": "text-xl sm:text-2xl font-semibold",
      "body": "text-sm sm:text-base leading-relaxed",
      "small": "text-xs sm:text-sm text-[color:var(--muted-fg)]"
    },
    "numbers": {
      "stat": "tabular-nums tracking-tight",
      "score": "tabular-nums font-semibold"
    }
  },

  "layout_and_grid": {
    "breakpoints": {
      "mobile": "<640px",
      "sm": "640px",
      "md": "768px",
      "lg": "1024px",
      "xl": "1280px",
      "2xl": "1536px"
    },
    "containers": {
      "public": "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8",
      "admin": "max-w-[1400px] mx-auto px-3 sm:px-6"
    },
    "public_shell_structure": {
      "header": "sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-[color:rgba(254,254,254,0.78)] border-b border-[color:var(--border)]",
      "hero": "pt-8 sm:pt-12 pb-8",
      "sections": "py-10 sm:py-14",
      "footer": "mt-16 border-t border-[color:var(--border)] bg-[color:var(--club-tertiary)] text-white"
    },
    "admin_shell_structure": {
      "sidebar": "fixed inset-y-0 left-0 w-[280px] hidden lg:flex",
      "topbar": "sticky top-0 z-40 bg-[color:rgba(254,254,254,0.86)] backdrop-blur border-b",
      "content": "lg:pl-[280px]"
    }
  },

  "component_path": {
    "shadcn_ui": {
      "button": "/app/frontend/src/components/ui/button.jsx",
      "badge": "/app/frontend/src/components/ui/badge.jsx",
      "card": "/app/frontend/src/components/ui/card.jsx",
      "input": "/app/frontend/src/components/ui/input.jsx",
      "textarea": "/app/frontend/src/components/ui/textarea.jsx",
      "select": "/app/frontend/src/components/ui/select.jsx",
      "checkbox": "/app/frontend/src/components/ui/checkbox.jsx",
      "radio_group": "/app/frontend/src/components/ui/radio-group.jsx",
      "switch": "/app/frontend/src/components/ui/switch.jsx",
      "tabs": "/app/frontend/src/components/ui/tabs.jsx",
      "table": "/app/frontend/src/components/ui/table.jsx",
      "pagination": "/app/frontend/src/components/ui/pagination.jsx",
      "dialog": "/app/frontend/src/components/ui/dialog.jsx",
      "drawer": "/app/frontend/src/components/ui/drawer.jsx",
      "sheet": "/app/frontend/src/components/ui/sheet.jsx",
      "dropdown_menu": "/app/frontend/src/components/ui/dropdown-menu.jsx",
      "navigation_menu": "/app/frontend/src/components/ui/navigation-menu.jsx",
      "breadcrumb": "/app/frontend/src/components/ui/breadcrumb.jsx",
      "calendar": "/app/frontend/src/components/ui/calendar.jsx",
      "skeleton": "/app/frontend/src/components/ui/skeleton.jsx",
      "sonner_toast": "/app/frontend/src/components/ui/sonner.jsx",
      "tooltip": "/app/frontend/src/components/ui/tooltip.jsx",
      "scroll_area": "/app/frontend/src/components/ui/scroll-area.jsx",
      "separator": "/app/frontend/src/components/ui/separator.jsx",
      "avatar": "/app/frontend/src/components/ui/avatar.jsx"
    },
    "recommended_new_components_js": {
      "public": [
        "src/components/public/PublicHeader.js",
        "src/components/public/PublicFooter.js",
        "src/components/public/HeroClubShell.js",
        "src/components/public/SectionPlaceholder.js",
        "src/components/public/MatchCardShell.js",
        "src/components/public/NewsCardShell.js",
        "src/components/public/SponsorsStrip.js"
      ],
      "admin": [
        "src/components/admin/AdminShell.js",
        "src/components/admin/AdminSidebar.js",
        "src/components/admin/AdminTopbar.js",
        "src/components/admin/StatCard.js",
        "src/components/admin/DataTableShell.js",
        "src/components/admin/EmptyState.js",
        "src/components/admin/MediaGrid.js",
        "src/components/admin/RolePermissionMatrix.js"
      ],
      "shared": [
        "src/components/shared/LoadingState.js",
        "src/components/shared/ErrorState.js",
        "src/components/shared/ClubCrestMark.js"
      ]
    }
  },

  "components_spec": {
    "buttons": {
      "base": {
        "shape": "Rounded (10–14px), strong weight",
        "tailwind": "rounded-[var(--radius-md)] font-medium",
        "focus": "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2",
        "motion": "transition-colors duration-[var(--dur-2)]"
      },
      "variants": {
        "primary_cta": {
          "usage": "Primary actions (Create, Save, Publish placeholder, Login)",
          "classes": "bg-[color:var(--club-primary)] text-[color:var(--primary-fg)] hover:bg-[color:rgba(252,207,43,0.88)] active:bg-[color:rgba(252,207,43,0.78)]",
          "note": "Never use gold text on white. Gold is background/accent."
        },
        "secondary": {
          "classes": "bg-[color:var(--club-secondary)] text-white hover:bg-[color:rgba(1,40,145,0.92)]"
        },
        "outline": {
          "classes": "border border-[color:var(--border-strong)] bg-transparent hover:bg-[color:rgba(34,34,34,0.04)]"
        },
        "ghost": {
          "classes": "bg-transparent hover:bg-[color:rgba(1,40,145,0.06)] text-[color:var(--club-secondary)]"
        },
        "danger": {
          "classes": "bg-[color:var(--error)] text-white hover:bg-[color:rgba(220,38,38,0.92)]"
        }
      },
      "sizes": {
        "sm": "h-9 px-3 text-sm",
        "md": "h-10 px-4 text-sm",
        "lg": "h-11 px-5 text-base"
      },
      "micro_interactions": [
        "On hover: subtle highlight only (no transform).",
        "On press: use active color shift; optional scale only on icon buttons (scale-[0.98])",
        "Loading: show spinner left + keep width stable"
      ]
    },

    "cards": {
      "public_card": {
        "classes": "rounded-[var(--radius-lg)] bg-[color:var(--surface)] border border-[color:var(--border)] shadow-[var(--shadow-sm)]",
        "header": "Space Grotesk, tight tracking",
        "hover": "hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--dur-3)]"
      },
      "admin_card": {
        "classes": "rounded-[var(--radius-md)] bg-[color:var(--surface)] border border-[color:var(--border)]",
        "density": "More compact padding: p-4 sm:p-5"
      },
      "stat_card": {
        "classes": "relative overflow-hidden",
        "accent": "Add a 3px left border in secondary OR a top hairline in gold",
        "tailwind_accent": "before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[color:var(--club-primary)]"
      }
    },

    "forms": {
      "inputs": {
        "classes": "bg-white border-[color:var(--border)] focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]",
        "help_text": "text-xs text-[color:var(--muted-fg)]",
        "error_text": "text-xs text-[color:var(--error)]",
        "required": "Use Label + * indicator in muted fg"
      },
      "selects": {
        "component": "shadcn Select",
        "note": "Never use native <select>"
      },
      "date": {
        "component": "shadcn Calendar in Popover",
        "note": "Matches/Seasons filters"
      }
    },

    "tables_and_lists": {
      "table_shell": {
        "top_controls": "Search left, filters right, primary action button far right on desktop; stacked on mobile",
        "row_density": "Default 44–52px row height",
        "sticky_header": "Optional for long lists using ScrollArea",
        "empty_state": "Always show EmptyState component with primary action"
      },
      "table_styles": {
        "header": "bg-[color:rgba(1,40,145,0.04)] text-[color:var(--club-tertiary)]",
        "row_hover": "hover:bg-[color:rgba(252,207,43,0.10)]",
        "selected": "bg-[color:rgba(252,207,43,0.16)]"
      },
      "pagination": {
        "component": "shadcn Pagination",
        "note": "Always show total count + current range (e.g., 21–40 of 128)"
      }
    },

    "badges": {
      "status": {
        "success": "bg-[color:rgba(22,163,74,0.12)] text-[color:#166534] border border-[color:rgba(22,163,74,0.22)]",
        "warning": "bg-[color:rgba(245,158,11,0.14)] text-[color:#92400E] border border-[color:rgba(245,158,11,0.24)]",
        "error": "bg-[color:rgba(220,38,38,0.12)] text-[color:#991B1B] border border-[color:rgba(220,38,38,0.22)]",
        "info": "bg-[color:rgba(2,132,199,0.12)] text-[color:#075985] border border-[color:rgba(2,132,199,0.22)]"
      },
      "club_accent": {
        "gold_outline": "border border-[color:rgba(252,207,43,0.55)] text-[color:var(--club-tertiary)] bg-[color:rgba(252,207,43,0.12)]"
      }
    },

    "modals_drawers": {
      "create_edit": {
        "desktop": "Use Dialog for create/edit forms",
        "mobile": "Use Drawer or Sheet from bottom/right",
        "footer": "Primary Save + secondary Cancel; destructive actions separated"
      }
    },

    "navigation": {
      "public_header": {
        "pattern": "Left crest + club name, center nav (desktop), right CTA (optional). Mobile uses Sheet menu.",
        "active_state": "Underline in gold + text in secondary",
        "tailwind_active": "text-[color:var(--club-secondary)] after:block after:h-[2px] after:bg-[color:var(--club-primary)] after:mt-2"
      },
      "admin_sidebar": {
        "pattern": "Icon + label, grouped sections, collapsible on mobile via Sheet",
        "active_state": "Left rail gold + subtle blue tint background",
        "tailwind_active": "bg-[color:rgba(1,40,145,0.06)] text-[color:var(--club-secondary)] border-l-4 border-[color:var(--club-primary)]"
      },
      "breadcrumbs": {
        "component": "shadcn Breadcrumb",
        "usage": "Admin pages only"
      }
    },

    "loading_empty_error": {
      "loading": {
        "component": "shadcn Skeleton",
        "patterns": [
          "Public cards: 3-up skeleton grid",
          "Admin tables: header skeleton + 8 row skeleton",
          "Hero: title line + 2 subtitle lines"
        ]
      },
      "empty": {
        "tone": "Supportive + action-oriented",
        "structure": "Icon (lucide), title, 1-line explanation, primary action",
        "example_copy": {
          "players": "Belum ada pemain. Tambahkan pemain pertama untuk mulai menyusun skuad.",
          "matches": "Belum ada jadwal pertandingan. Buat pertandingan untuk musim ini.",
          "gallery": "Belum ada album. Unggah foto pertandingan atau latihan."
        }
      },
      "error": {
        "structure": "Alert component + retry button",
        "copy": "Terjadi kendala saat memuat data. Coba lagi."
      },
      "404": {
        "public": "Strong club tone: ‘Halaman tidak ditemukan’ + CTA kembali ke Beranda",
        "admin": "Keep utilitarian: link back to Dashboard"
      }
    }
  },

  "page_blueprints": {
    "public": {
      "/": {
        "sections": [
          "Header (sticky)",
          "HeroClubShell (stadium image + club identity + quick links)",
          "Latest News placeholder (cards + empty state)",
          "Matches placeholder (next match card + list shell)",
          "Gallery placeholder (masonry-ish 2x2 grid shell)",
          "SponsorsStrip",
          "Footer"
        ],
        "hero_layout": {
          "mobile": "Stacked: crest/name -> tagline -> 2 CTAs -> quick chips",
          "desktop": "Split: left copy, right media card (image + overlay stats)"
        }
      },
      "/news": {
        "layout": "List shell with filters row (category/tag placeholder) + cards grid",
        "empty_state": "No posts yet"
      },
      "/matches": {
        "layout": "Upcoming/Results tabs (shadcn Tabs) + match cards",
        "filters": "Season + Competition (Select)"
      },
      "/gallery": {
        "layout": "Album grid + skeletons",
        "empty_state": "No albums yet"
      },
      "/club": {
        "layout": "Minimal about shell: crest, short description, key facts cards",
        "note": "Phase 1 only: keep content minimal"
      },
      "*": {
        "layout": "404 page with strong dark section + gold CTA"
      }
    },

    "admin": {
      "/admin/login": {
        "layout": "Centered card but page content aligned left inside card; background uses subtle stadium-glow overlay",
        "fields": ["email/username", "password"],
        "cta": "Login primary",
        "data_testids": [
          "admin-login-form",
          "admin-login-username-input",
          "admin-login-password-input",
          "admin-login-submit-button"
        ]
      },
      "/admin": {
        "layout": "AdminShell + topbar + stat cards row + recent activity placeholder + system status panel",
        "components": ["StatCard", "Card", "Badge", "Table (compact)"]
      },
      "module_list_pages": {
        "applies_to": [
          "/admin/club",
          "/admin/teams",
          "/admin/players",
          "/admin/staff",
          "/admin/seasons",
          "/admin/competitions",
          "/admin/matches",
          "/admin/gallery",
          "/admin/sponsors",
          "/admin/users"
        ],
        "layout": "Title + breadcrumbs + actions row + DataTableShell",
        "table_controls": ["search", "filters", "create"],
        "create_edit": "Dialog on desktop, Drawer on mobile"
      },
      "/admin/content": {
        "layout": "Tabs: Posts | Categories | Tags | Authors",
        "note": "Each tab uses same DataTableShell pattern"
      },
      "/admin/media": {
        "layout": "Two-pane on desktop: left upload panel, right MediaGrid; stacked on mobile",
        "components": ["Card", "Input", "Button", "Progress", "AspectRatio"]
      },
      "/admin/system": {
        "layout": "System status cards + role/permission matrix view + meta table",
        "components": ["Badge", "Table", "Tabs"]
      }
    }
  },

  "motion_and_microinteractions": {
    "library": {
      "recommended": "framer-motion",
      "install": "npm i framer-motion",
      "usage": "Use for page transitions (fade/slide), list item entrance, and subtle hero media parallax."
    },
    "principles": [
      "Use motion to clarify hierarchy (entrance for hero + cards), not to decorate.",
      "No universal transition: only transition-colors, transition-shadow, transition-opacity.",
      "Respect prefers-reduced-motion: disable parallax and entrance animations."
    ],
    "patterns": {
      "public_hero": "Image card floats in with opacity + y (12px).",
      "admin_tables": "Rows do not animate on every render; only animate empty->loaded skeleton crossfade.",
      "sidebar": "Active indicator slides (left rail) using layout animations."
    }
  },

  "data_visualization": {
    "optional_phase_1": {
      "library": "recharts",
      "install": "npm i recharts",
      "use_cases": ["Admin dashboard: matches per month (placeholder)", "content posts trend (placeholder)"],
      "style": "Use secondary blue for lines, gold for highlights, neutral gridlines."
    }
  },

  "iconography": {
    "library": "lucide-react",
    "rule": "No emoji icons. Use lucide icons for nav + empty states.",
    "suggested_icons": {
      "dashboard": "LayoutDashboard",
      "club": "Shield",
      "teams": "Users",
      "players": "User",
      "staff": "Briefcase",
      "seasons": "Calendar",
      "competitions": "Trophy",
      "matches": "Swords",
      "content": "Newspaper",
      "gallery": "Images",
      "media": "Upload",
      "sponsors": "Handshake",
      "system": "Activity",
      "users": "UserCog"
    }
  },

  "image_urls": {
    "public_hero": [
      {
        "url": "https://images.pexels.com/photos/31377598/pexels-photo-31377598.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "description": "Hero background: stadium crowd energy (apply dark overlay for readability)",
        "category": "hero"
      },
      {
        "url": "https://images.pexels.com/photos/29388434/pexels-photo-29388434.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "description": "Alternate hero / section banner",
        "category": "hero"
      }
    ],
    "player_portrait_placeholders": [
      {
        "url": "https://images.unsplash.com/photo-1560800155-6a1dee6a3d59?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxmb290YmFsbCUyMHBsYXllciUyMHBvcnRyYWl0JTIwc3R1ZGlvJTIwZHJhbWF0aWMlMjBsaWdodGluZ3xlbnwwfHx8Ymx1ZXwxNzg3Njg1Njk4fDA&ixlib=rb-4.1.0&q=85",
        "description": "Player card placeholder (use as fallback only)",
        "category": "players"
      },
      {
        "url": "https://images.pexels.com/photos/34609649/pexels-photo-34609649.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "description": "Player portrait placeholder (dramatic lighting)",
        "category": "players"
      }
    ],
    "trophy_premium_accents": [
      {
        "url": "https://images.unsplash.com/photo-1563643007429-86e98b32b33f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwzfHxmb290YmFsbCUyMGNsdWIlMjB0cm9waHklMjBjbG9zZSUyMHVwJTIwcHJlbWl1bXxlbnwwfHx8d2hpdGV8MTc4NzY4NTcwNXww&ixlib=rb-4.1.0&q=85",
        "description": "Decorative image for empty states or club about shell (use sparingly)",
        "category": "accents"
      }
    ]
  },

  "instructions_to_main_agent": {
    "global_css_updates": [
      "Replace default shadcn :root tokens in /app/frontend/src/index.css with ALSABBAT tokens (keep structure).",
      "Remove CRA demo styles in /app/frontend/src/App.css (App-logo etc). Ensure no .App { text-align:center }.",
      "Add font imports (Google Fonts) in index.html or CSS and set body font to IBM Plex Sans; headings use Space Grotesk via utility classes or CSS variables.",
      "Implement optional runtime theme override: after fetching /api/club/active, set document.documentElement.style.setProperty('--club-primary', club.primary_color || '#FCCF2B') etc, but never change defaults unless API provides same brand palette (Phase 1 safe mode)."
    ],
    "public_shell_build": [
      "Use shadcn NavigationMenu for desktop nav and Sheet for mobile nav.",
      "Hero uses stadium image with dark overlay (bg-[color:rgba(34,34,34,0.72)]) and mild stadium-glow gradient overlay.",
      "All placeholders must have LoadingState, EmptyState, ErrorState patterns."
    ],
    "admin_shell_build": [
      "AdminShell: Sidebar + Topbar + content area. Sidebar uses grouped nav items with lucide icons.",
      "DataTableShell: search input, filters (Select/Calendar), pagination, row actions (DropdownMenu).",
      "Create/Edit: Dialog desktop, Drawer/Sheet mobile.",
      "Media: grid with AspectRatio thumbnails + upload panel with Progress."
    ],
    "testing": [
      "Add data-testid to: nav links, sidebar items, primary buttons, search inputs, filter selects, pagination controls, table rows actions, empty/error states, system status badges."
    ],
    "js_files_only": "All new components should be .js (not .tsx). Use named exports for components and default exports for pages."
  },

  "general_ui_ux_design_guidelines_appendix": "<General UI UX Design Guidelines>  \n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
