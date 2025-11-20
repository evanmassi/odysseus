# Inventory Permission & Locking System Overview

## 🧭 Core Principle
The system should **balance user autonomy with administrative oversight**.  
Users can manage and reserve their own inventory space, but admins retain the ultimate authority to view, override, or reassign any resource when necessary.

---

## ⚙️ Functional Pillars

### 1. **User Autonomy**
- Users can **claim ownership** of certain inventory elements (like racks, boxes, or tubes).  
- Ownership gives them **exclusive modification rights** — only they (and admins) can add, move, or edit contents.
- They can voluntarily **release** or **share** ownership with specific users.

> “Users should feel like they own their assigned boxes and can work without interference, but never outside admin visibility.”

---

### 2. **Administrative Oversight**
- Admins have **global visibility** and **override powers**.  
- They can unlock, reassign, or view any user’s locked inventory.
- Any admin override should **generate an audit record** for accountability.

> “Admins can always step in — but the system should log when they do.”

---

### 3. **Granular Control**
- The system operates on **hierarchical access** (Tank → Rack → Box → Tube).  
- Locks or ownership cascade *downward* (locking a rack locks its boxes and tubes), but not upward.
- Users can choose to lock only specific levels (e.g., a box without locking the rack).

> “Ownership should be scoped. Locking a box shouldn’t lock the world.”

---

### 4. **Visibility Rules**
- Locked or restricted items are still **visible** to others, but **read-only** (unless explicitly hidden by policy).  
- Visual cues (icons, greyed-out areas, tooltips) make it obvious who owns or locked an item.

> “Transparency over secrecy — people should see who’s using what, just not touch it.”

---

### 5. **Reservation & Collaboration**
- Allow **temporary locks or reservations** that expire automatically after a set time.  
- Users can **share** access (co-ownership) for collaborative work, optionally revocable.

> “Make collaboration possible without chaos.”

---

### 6. **Auditability & Accountability**
- Every lock, unlock, share, or override action creates a **traceable record**.  
- The system can produce a simple “who-touched-what-when” trail for admins.

> “If it can be changed, it can be tracked.”

---

### 7. **Fail-Safe Structure**
- In any conflict (e.g., two users claiming the same box), the system prioritizes:
  1. Admin action → 2. Existing lock owner → 3. First claim in time.
- No action should be destructive without confirmation or a clear trail.

> “Conflict resolution should be deterministic, not guesswork.”

---

## 🧩 Summary for Developers
“I want a permission and ownership system where users can lock or reserve specific parts of the inventory — like racks, boxes, or tubes — for their own use, but admins can always view, override, or unlock anything if needed. Ownership should cascade down the hierarchy (Tank → Rack → Box → Tube), and all actions should be auditable. Users should have the freedom to manage their space, but admins remain the ultimate authority.”
