/**
 * Build-time SEO file generation (Phase 10).
 *
 * robots.txt must reference the sitemap with an absolute URL, and the final
 * domain is environment-driven — never hard-coded. Without the env vars the
 * generated robots.txt is still valid, just without the Sitemap directive.
 */
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const site = (process.env.REACT_APP_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
const backend = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");
const sitemap = backend ? `${backend}/api/seo/sitemap.xml` : "";

const lines = [
    "# ALSABBAT Football Club — generated at build time, do not edit by hand",
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /checkout",
    "Disallow: /cart",
];
if (sitemap) lines.push(`Sitemap: ${sitemap}`);
if (site) lines.push(`Host: ${site.replace(/^https?:\/\//, "")}`);

const target = path.join(__dirname, "..", "public", "robots.txt");
fs.writeFileSync(target, `${lines.join("\n")}\n`, "utf8");
console.log(
    `[seo] robots.txt written${sitemap ? ` (sitemap: ${sitemap})` : " (no sitemap: set REACT_APP_BACKEND_URL)"}`,
);
