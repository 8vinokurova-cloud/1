# 📜 MASTER CREATION GUIDE: 1-Shot Luxury Event Site Creation

This guide documents the strict rules, architectural invariants, visual design code, and step-by-step 1-shot procedure for creating and deploying new isolated event sites on the platform.

Refer to full Russian & English documentation in artifact: [master_site_creation_guide.md](file:///C:/Users/8vino/.gemini/antigravity/brain/93c7aca4-9f75-4f2a-ae74-3b502be4ea11/master_site_creation_guide.md).

## Core Rules:
1. 0 Cyrillic characters in developer code files (JS, CSS, HTML, server.js). All Russian content strictly stored in CMS data.
2. Complete isolation between events (master_default, nana, etc.).
3. 24/7 Cloud sync between Vercel (frontend), Render (backend/DB), and GitHub (8vinokurova-cloud/1).
4. Protocol: Audit -> Plan -> Approval ("Делай") -> Execute -> Verify.
