import customtkinter as ctk
from tkinter import filedialog, messagebox
from PIL import Image
import json
import os
import shutil

# ──────────────────────────────── CONFIG ────────────────────────────────────
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

DATA_FILE = os.path.join("data", "products.json")
ASSETS_DIR = "assets"

os.makedirs("data", exist_ok=True)
os.makedirs(ASSETS_DIR, exist_ok=True)


# ──────────────────────────────── HELPERS ───────────────────────────────────
def load_products() -> list[dict]:
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_products(products: list[dict]) -> None:
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)


def load_ctk_image(path: str, size=(120, 120)) -> ctk.CTkImage | None:
    try:
        img = Image.open(path).convert("RGBA")
        return ctk.CTkImage(light_image=img, dark_image=img, size=size)
    except Exception:
        return None


# ═══════════════════════════════════════════════════════════════════════════
#  PRODUCT DIALOG  (Add / Edit)
# ═══════════════════════════════════════════════════════════════════════════
class ProductDialog(ctk.CTkToplevel):
    def __init__(self, master, product: dict | None = None):
        super().__init__(master)
        self.title("Thêm sản phẩm" if product is None else "Sửa sản phẩm")
        self.geometry("420x420")
        self.resizable(False, False)
        self.grab_set()

        self.result: dict | None = None
        self._img_src: str = product["image"] if product else ""

        pad = {"padx": 16, "pady": 6}

        ctk.CTkLabel(self, text="Tên sản phẩm:").pack(**pad, anchor="w")
        self.name_var = ctk.StringVar(value=product["name"] if product else "")
        ctk.CTkEntry(self, textvariable=self.name_var, width=380).pack(**pad)

        ctk.CTkLabel(self, text="Loại:").pack(**pad, anchor="w")
        self.type_var = ctk.StringVar(value=product["type"] if product else "")
        ctk.CTkEntry(self, textvariable=self.type_var, width=380).pack(**pad)

        ctk.CTkLabel(self, text="Số lượng:").pack(**pad, anchor="w")
        self.qty_var = ctk.StringVar(value=str(product["quantity"]) if product else "0")
        ctk.CTkEntry(self, textvariable=self.qty_var, width=380).pack(**pad)

        ctk.CTkLabel(self, text="Ảnh:").pack(**pad, anchor="w")
        img_row = ctk.CTkFrame(self, fg_color="transparent")
        img_row.pack(**pad, fill="x")
        self.img_label = ctk.CTkLabel(img_row, text=self._short_path(), anchor="w", width=290)
        self.img_label.pack(side="left", padx=(16, 4))
        ctk.CTkButton(img_row, text="Chọn ảnh", width=90,
                      command=self._pick_image).pack(side="left")

        btn_row = ctk.CTkFrame(self, fg_color="transparent")
        btn_row.pack(side="bottom", pady=16)
        ctk.CTkButton(btn_row, text="Lưu", width=120, command=self._save).pack(side="left", padx=8)
        ctk.CTkButton(btn_row, text="Huỷ", width=120, fg_color="gray40",
                      hover_color="gray30", command=self.destroy).pack(side="left", padx=8)

    def _short_path(self) -> str:
        return os.path.basename(self._img_src) if self._img_src else "(chưa chọn)"

    def _pick_image(self):
        path = filedialog.askopenfilename(
            title="Chọn ảnh sản phẩm",
            filetypes=[("Ảnh", "*.png *.jpg *.jpeg *.webp *.bmp")]
        )
        if path:
            dest = os.path.join(ASSETS_DIR, os.path.basename(path))
            if os.path.abspath(path) != os.path.abspath(dest):
                shutil.copy2(path, dest)
            self._img_src = dest
            self.img_label.configure(text=self._short_path())

    def _save(self):
        name = self.name_var.get().strip()
        ptype = self.type_var.get().strip()
        if not name:
            messagebox.showwarning("Thiếu thông tin", "Vui lòng nhập tên sản phẩm.", parent=self)
            return
        try:
            qty = int(self.qty_var.get())
        except ValueError:
            messagebox.showwarning("Lỗi", "Số lượng phải là số nguyên.", parent=self)
            return
        self.result = {"name": name, "type": ptype, "quantity": qty, "image": self._img_src}
        self.destroy()


# ═══════════════════════════════════════════════════════════════════════════
#  TAB: QUẢN LÝ
# ═══════════════════════════════════════════════════════════════════════════
class ManageTab(ctk.CTkFrame):
    def __init__(self, master, on_change=None):
        super().__init__(master, fg_color="transparent")
        self.on_change = on_change
        self.products: list[dict] = load_products()
        self._build_ui()
        self._refresh_list()

    # ── layout ──────────────────────────────────────────────────────────────
    def _build_ui(self):
        # Top toolbar
        toolbar = ctk.CTkFrame(self, fg_color="transparent")
        toolbar.pack(fill="x", padx=16, pady=(12, 4))

        ctk.CTkLabel(toolbar, text="Quản lý sản phẩm",
                     font=ctk.CTkFont(size=18, weight="bold")).pack(side="left")

        ctk.CTkButton(toolbar, text="+ Thêm", width=90,
                      command=self._add).pack(side="right", padx=4)
        ctk.CTkButton(toolbar, text="✎ Sửa", width=90,
                      command=self._edit).pack(side="right", padx=4)
        ctk.CTkButton(toolbar, text="✕ Xoá", width=90, fg_color="#c0392b",
                      hover_color="#922b21", command=self._delete).pack(side="right", padx=4)

        # Search bar
        search_row = ctk.CTkFrame(self, fg_color="transparent")
        search_row.pack(fill="x", padx=16, pady=4)
        ctk.CTkLabel(search_row, text="Tìm:").pack(side="left", padx=(0, 6))
        self.search_var = ctk.StringVar()
        self.search_var.trace_add("write", lambda *_: self._refresh_list())
        ctk.CTkEntry(search_row, textvariable=self.search_var, width=300).pack(side="left")

        # Table header
        header = ctk.CTkFrame(self, fg_color="#1e1e2e", corner_radius=6)
        header.pack(fill="x", padx=16, pady=(8, 0))
        for col, w in [("Tên sản phẩm", 280), ("Loại", 140), ("SL", 60), ("Ảnh", 200)]:
            ctk.CTkLabel(header, text=col, width=w,
                         font=ctk.CTkFont(weight="bold")).pack(side="left", padx=4, pady=6)

        # Scrollable list
        self.list_frame = ctk.CTkScrollableFrame(self, fg_color="#16213e")
        self.list_frame.pack(fill="both", expand=True, padx=16, pady=(0, 12))

        self.selected_idx: int | None = None

    # ── list rendering ───────────────────────────────────────────────────────
    def _refresh_list(self, *_):
        for w in self.list_frame.winfo_children():
            w.destroy()
        q = self.search_var.get().lower()
        self._visible = [p for p in self.products if q in p["name"].lower() or q in p["type"].lower()]
        self.selected_idx = None

        for i, p in enumerate(self._visible):
            row = ctk.CTkFrame(self.list_frame, fg_color="#1a1a2e" if i % 2 == 0 else "#16213e",
                               corner_radius=4)
            row.pack(fill="x", pady=1)
            row.bind("<Button-1>", lambda e, idx=i: self._select(idx))

            ctk.CTkLabel(row, text=p["name"], width=280, anchor="w").pack(side="left", padx=4, pady=6)
            ctk.CTkLabel(row, text=p["type"], width=140, anchor="w").pack(side="left", padx=4)
            ctk.CTkLabel(row, text=str(p["quantity"]), width=60, anchor="center").pack(side="left", padx=4)
            img_txt = os.path.basename(p["image"]) if p["image"] else "-"
            ctk.CTkLabel(row, text=img_txt, width=200, anchor="w",
                         text_color="gray70").pack(side="left", padx=4)

            for child in row.winfo_children():
                child.bind("<Button-1>", lambda e, idx=i: self._select(idx))

    def _select(self, idx: int):
        self.selected_idx = idx
        children = self.list_frame.winfo_children()
        for i, row in enumerate(children):
            row.configure(fg_color="#1b4f72" if i == idx else ("#1a1a2e" if i % 2 == 0 else "#16213e"))

    # ── CRUD ─────────────────────────────────────────────────────────────────
    def _add(self):
        dlg = ProductDialog(self)
        self.wait_window(dlg)
        if dlg.result:
            self.products.append(dlg.result)
            save_products(self.products)
            self._refresh_list()
            if self.on_change:
                self.on_change()

    def _edit(self):
        if self.selected_idx is None:
            messagebox.showinfo("Chưa chọn", "Hãy chọn sản phẩm cần sửa.")
            return
        prod = self._visible[self.selected_idx]
        real_idx = self.products.index(prod)
        dlg = ProductDialog(self, product=prod)
        self.wait_window(dlg)
        if dlg.result:
            self.products[real_idx] = dlg.result
            save_products(self.products)
            self._refresh_list()
            if self.on_change:
                self.on_change()

    def _delete(self):
        if self.selected_idx is None:
            messagebox.showinfo("Chưa chọn", "Hãy chọn sản phẩm cần xoá.")
            return
        prod = self._visible[self.selected_idx]
        if not messagebox.askyesno("Xác nhận xoá", f'Xoá "{prod["name"]}"?'):
            return
        self.products.remove(prod)
        save_products(self.products)
        self._refresh_list()
        if self.on_change:
            self.on_change()

    def reload(self):
        self.products = load_products()
        self._refresh_list()


# ═══════════════════════════════════════════════════════════════════════════
#  CELL PICKER DIALOG
# ═══════════════════════════════════════════════════════════════════════════
class CellPickerDialog(ctk.CTkToplevel):
    """Chọn sản phẩm từ kho để đặt vào ô lưới."""

    def __init__(self, master, products: list[dict], cell_label: str):
        super().__init__(master)
        self.title(f"Chọn sản phẩm cho ô {cell_label}")
        self.geometry("480x520")
        self.resizable(False, False)
        self.grab_set()
        self.result: dict | None = None
        self._products = products
        self._selected = None

        ctk.CTkLabel(self, text=f"Ô {cell_label} — chọn sản phẩm",
                     font=ctk.CTkFont(size=15, weight="bold")).pack(pady=(14, 6))

        # Search
        search_row = ctk.CTkFrame(self, fg_color="transparent")
        search_row.pack(fill="x", padx=16, pady=4)
        ctk.CTkLabel(search_row, text="Tìm:").pack(side="left", padx=(0, 6))
        self.search_var = ctk.StringVar()
        self.search_var.trace_add("write", lambda *_: self._refresh())
        ctk.CTkEntry(search_row, textvariable=self.search_var, width=320).pack(side="left")

        self.list_frame = ctk.CTkScrollableFrame(self, fg_color="#16213e")
        self.list_frame.pack(fill="both", expand=True, padx=16, pady=6)
        self._refresh()

        btn_row = ctk.CTkFrame(self, fg_color="transparent")
        btn_row.pack(pady=10)
        ctk.CTkButton(btn_row, text="Chọn", width=120, command=self._confirm).pack(side="left", padx=8)
        ctk.CTkButton(btn_row, text="Xoá ô", width=120, fg_color="gray40",
                      hover_color="gray30", command=self._clear).pack(side="left", padx=8)
        ctk.CTkButton(btn_row, text="Huỷ", width=120, fg_color="#c0392b",
                      hover_color="#922b21", command=self.destroy).pack(side="left", padx=8)

    def _refresh(self):
        for w in self.list_frame.winfo_children():
            w.destroy()
        q = self.search_var.get().lower()
        self._visible = [p for p in self._products if q in p["name"].lower() or q in p["type"].lower()]
        for i, p in enumerate(self._visible):
            row = ctk.CTkFrame(self.list_frame, fg_color="#1a1a2e" if i % 2 == 0 else "#16213e",
                               corner_radius=4)
            row.pack(fill="x", pady=1)
            ctk.CTkLabel(row, text=p["name"], width=200, anchor="w").pack(side="left", padx=8, pady=6)
            ctk.CTkLabel(row, text=p["type"], width=120, anchor="w",
                         text_color="gray70").pack(side="left")
            ctk.CTkLabel(row, text=f"SL: {p['quantity']}", width=80,
                         anchor="center").pack(side="left")
            row.bind("<Button-1>", lambda e, idx=i: self._select(idx))
            for child in row.winfo_children():
                child.bind("<Button-1>", lambda e, idx=i: self._select(idx))

    def _select(self, idx):
        self._selected = idx
        for i, row in enumerate(self.list_frame.winfo_children()):
            row.configure(fg_color="#1b4f72" if i == idx else ("#1a1a2e" if i % 2 == 0 else "#16213e"))

    def _confirm(self):
        if self._selected is None:
            messagebox.showinfo("Chưa chọn", "Hãy chọn một sản phẩm.", parent=self)
            return
        self.result = self._visible[self._selected]
        self.destroy()

    def _clear(self):
        self.result = {}   # empty dict = signal to clear
        self.destroy()


# ═══════════════════════════════════════════════════════════════════════════
#  TAB: TRƯNG BÀY
# ═══════════════════════════════════════════════════════════════════════════
GRID_ROWS = 4
GRID_COLS = 4
CELL_SIZE = 160


class DisplayTab(ctk.CTkFrame):
    def __init__(self, master):
        super().__init__(master, fg_color="transparent")
        self.products: list[dict] = load_products()
        # grid_data[r][c] = product dict or None
        self.grid_data: list[list[dict | None]] = [[None] * GRID_COLS for _ in range(GRID_ROWS)]
        self._cell_frames: list[list[ctk.CTkFrame]] = []
        self._build_ui()

    def _build_ui(self):
        ctk.CTkLabel(self, text="Sơ đồ trưng bày (4 × 4)",
                     font=ctk.CTkFont(size=18, weight="bold")).pack(pady=(12, 8))
        ctk.CTkLabel(self, text="Nhấp vào ô để gán / thay đổi sản phẩm",
                     text_color="gray60").pack(pady=(0, 12))

        grid_container = ctk.CTkFrame(self, fg_color="#0d1117", corner_radius=10)
        grid_container.pack(padx=24, pady=4)

        for r in range(GRID_ROWS):
            row_frames = []
            for c in range(GRID_COLS):
                cell = ctk.CTkFrame(grid_container, width=CELL_SIZE, height=CELL_SIZE,
                                    fg_color="#1a1a2e", corner_radius=8,
                                    border_width=1, border_color="#2d2d4e")
                cell.grid(row=r, column=c, padx=6, pady=6)
                cell.grid_propagate(False)

                # Column header label (first row only)
                if r == 0:
                    ctk.CTkLabel(grid_container, text=f"C{c + 1}",
                                 text_color="gray50",
                                 font=ctk.CTkFont(size=11)).grid(row=GRID_ROWS, column=c, pady=(0, 4))

                # Row header label (first col only)
                if c == 0:
                    ctk.CTkLabel(grid_container, text=f"R{r + 1}",
                                 text_color="gray50",
                                 font=ctk.CTkFont(size=11)).grid(row=r, column=GRID_COLS, padx=(4, 0))

                label = f"R{r+1}C{c+1}"
                cell.bind("<Button-1>", lambda e, rr=r, cc=c: self._cell_click(rr, cc))
                self._render_empty_cell(cell, label)
                row_frames.append(cell)
            self._cell_frames.append(row_frames)

    # ── rendering ────────────────────────────────────────────────────────────
    def _render_empty_cell(self, cell: ctk.CTkFrame, label: str):
        for w in cell.winfo_children():
            w.destroy()
        cell.configure(fg_color="#1a1a2e", border_color="#2d2d4e")
        lbl = ctk.CTkLabel(cell, text=f"+ {label}", text_color="gray50",
                           font=ctk.CTkFont(size=12))
        lbl.place(relx=0.5, rely=0.5, anchor="center")
        lbl.bind("<Button-1>", lambda e: cell.event_generate("<Button-1>"))

    def _render_product_cell(self, cell: ctk.CTkFrame, product: dict):
        for w in cell.winfo_children():
            w.destroy()
        cell.configure(fg_color="#1b3a4b", border_color="#2980b9")

        img = load_ctk_image(product["image"], size=(CELL_SIZE - 30, CELL_SIZE - 50)) if product.get("image") else None
        if img:
            img_lbl = ctk.CTkLabel(cell, image=img, text="")
            img_lbl.place(relx=0.5, rely=0.42, anchor="center")
            img_lbl.bind("<Button-1>", lambda e: cell.event_generate("<Button-1>"))
        else:
            placeholder = ctk.CTkLabel(cell, text="🖼", font=ctk.CTkFont(size=32))
            placeholder.place(relx=0.5, rely=0.38, anchor="center")
            placeholder.bind("<Button-1>", lambda e: cell.event_generate("<Button-1>"))

        name_lbl = ctk.CTkLabel(cell, text=product["name"], wraplength=CELL_SIZE - 16,
                                font=ctk.CTkFont(size=11, weight="bold"),
                                text_color="white")
        name_lbl.place(relx=0.5, rely=0.82, anchor="center")
        name_lbl.bind("<Button-1>", lambda e: cell.event_generate("<Button-1>"))

        qty_lbl = ctk.CTkLabel(cell, text=f"SL: {product['quantity']}",
                               font=ctk.CTkFont(size=10), text_color="gray70")
        qty_lbl.place(relx=0.5, rely=0.94, anchor="center")
        qty_lbl.bind("<Button-1>", lambda e: cell.event_generate("<Button-1>"))

    # ── click ─────────────────────────────────────────────────────────────────
    def _cell_click(self, r: int, c: int):
        label = f"R{r+1}C{c+1}"
        dlg = CellPickerDialog(self, self.products, label)
        self.wait_window(dlg)
        if dlg.result is None:
            return   # cancelled
        cell = self._cell_frames[r][c]
        if dlg.result == {}:  # clear signal
            self.grid_data[r][c] = None
            self._render_empty_cell(cell, label)
        else:
            self.grid_data[r][c] = dlg.result
            self._render_product_cell(cell, dlg.result)

    # ── called by app when products list changes ─────────────────────────────
    def reload(self):
        self.products = load_products()


# ═══════════════════════════════════════════════════════════════════════════
#  MAIN APP
# ═══════════════════════════════════════════════════════════════════════════
class App(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("POSTLAIN — Quản lý kho & Trưng bày")
        self.geometry("900x680")
        self.minsize(820, 600)

        # Side nav
        nav = ctk.CTkFrame(self, width=160, corner_radius=0, fg_color="#111827")
        nav.pack(side="left", fill="y")
        nav.pack_propagate(False)

        ctk.CTkLabel(nav, text="POSTLAIN", font=ctk.CTkFont(size=16, weight="bold"),
                     text_color="#3b82f6").pack(pady=(24, 4))
        ctk.CTkLabel(nav, text="Store Manager", font=ctk.CTkFont(size=11),
                     text_color="gray50").pack(pady=(0, 28))

        self.tab_manage_btn = ctk.CTkButton(
            nav, text="📦  Quản lý", anchor="w", width=140,
            fg_color="#1d4ed8", hover_color="#1e40af", command=lambda: self._switch("manage")
        )
        self.tab_manage_btn.pack(padx=10, pady=4)

        self.tab_display_btn = ctk.CTkButton(
            nav, text="🖼  Trưng bày", anchor="w", width=140,
            fg_color="transparent", hover_color="#374151", command=lambda: self._switch("display")
        )
        self.tab_display_btn.pack(padx=10, pady=4)

        ctk.CTkLabel(nav, text="", fg_color="transparent").pack(expand=True)
        ctk.CTkLabel(nav, text="v1.0", font=ctk.CTkFont(size=10),
                     text_color="gray40").pack(pady=12)

        # Content area
        self.content = ctk.CTkFrame(self, corner_radius=0, fg_color="#0f172a")
        self.content.pack(side="left", fill="both", expand=True)

        self.manage_tab = ManageTab(self.content, on_change=self._on_product_change)
        self.display_tab = DisplayTab(self.content)

        self._current = "manage"
        self.manage_tab.pack(fill="both", expand=True)

    def _switch(self, tab: str):
        if tab == self._current:
            return
        if self._current == "manage":
            self.manage_tab.pack_forget()
        else:
            self.display_tab.pack_forget()

        self._current = tab

        if tab == "manage":
            self.manage_tab.pack(fill="both", expand=True)
            self.tab_manage_btn.configure(fg_color="#1d4ed8")
            self.tab_display_btn.configure(fg_color="transparent")
        else:
            self.display_tab.reload()
            self.display_tab.pack(fill="both", expand=True)
            self.tab_display_btn.configure(fg_color="#1d4ed8")
            self.tab_manage_btn.configure(fg_color="transparent")

    def _on_product_change(self):
        self.display_tab.reload()


if __name__ == "__main__":
    app = App()
    app.mainloop()
