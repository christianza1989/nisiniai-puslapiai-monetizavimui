"""Lithuanian desktop UI for the domain classifier."""
import os
from pathlib import Path
import queue
import re
import sqlite3
import threading
import time
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import json

from classifier import (APP_DIR, DEFAULT_INPUT, DEFAULT_OUTPUT, Options, run,
                        configured_model, signature_for, CATEGORIES, ranked, AppError)
from codex_provider import CodexError
from export_csv import export_snapshot
from status import read_status
from pipeline import run_pipeline


class DomainApp:
    def __init__(self, root):
        self.root = root
        root.title("Domenų atranka · Codex CLI")
        root.geometry("1120x790")
        root.minsize(900, 640)
        self.messages = queue.Queue()
        self.stop = threading.Event()
        self.worker = None
        self.last_external_refresh = 0
        self.csv_busy = False
        self.input = tk.StringVar(value=str(DEFAULT_INPUT))
        self.output = tk.StringVar(value=str(DEFAULT_OUTPUT))
        self.model = tk.StringVar(value=configured_model())
        self.batch = tk.StringVar(value="100")
        self.workers = tk.StringVar(value="4")
        self.limit = tk.StringVar(value="0")
        self.status = tk.StringVar(value="Paruošta. AI darbams naudojamas tik Codex CLI.")
        style = ttk.Style(root)
        style.theme_use("clam")
        style.configure("TFrame", background="#f5f6f8")
        style.configure("TLabel", background="#f5f6f8", foreground="#1e293b", font=("Segoe UI", 10))
        style.configure("Title.TLabel", font=("Segoe UI", 20, "bold"))
        style.configure("TButton", padding=(12, 7), font=("Segoe UI", 10))
        style.configure("Treeview", rowheight=27, font=("Segoe UI", 10))
        style.configure("Treeview.Heading", font=("Segoe UI", 10, "bold"))
        outer = ttk.Frame(root, padding=24)
        outer.pack(fill="both", expand=True)
        ttk.Label(outer, text="Atraskite stipriausius nišų domenus", style="Title.TLabel").pack(anchor="w")
        ttk.Label(outer, text="Komerciniai raktažodžiai, galimos maržos ir monetizavimo keliai. DR — kitame etape.").pack(anchor="w", pady=(5, 20))
        form = ttk.Frame(outer)
        form.pack(fill="x")
        form.columnconfigure(1, weight=1)
        for row, (label, variable, picker) in enumerate([
            ("Domenų failas", self.input, self.pick_input),
            ("XLS failas / CSV katalogas", self.output, self.pick_output),
            ("Codex modelis · Extra high", self.model, None),
        ]):
            ttk.Label(form, text=label).grid(row=row, column=0, sticky="w", padx=(0, 16), pady=5)
            ttk.Entry(form, textvariable=variable).grid(row=row, column=1, sticky="ew", pady=5)
            if picker:
                ttk.Button(form, text="Pasirinkti", command=picker).grid(row=row, column=2, padx=(12, 0))
        settings = ttk.Frame(outer)
        settings.pack(fill="x", pady=(12, 15))
        for col, (label, variable) in enumerate([("Pirminės grupės dydis", self.batch), ("Codex procesų", self.workers), ("Naujų domenų limitas (0 = visi)", self.limit)]):
            ttk.Label(settings, text=label).grid(row=0, column=2 * col, padx=(0 if col == 0 else 20, 8))
            ttk.Entry(settings, textvariable=variable, width=7).grid(row=0, column=2 * col + 1)
        actions = ttk.Frame(outer)
        actions.pack(fill="x")
        self.start_button = ttk.Button(actions, text="Kategorizuoti / tęsti", command=lambda: self.start("analyze"))
        self.start_button.pack(side="left")
        self.extract_button = ttk.Button(actions, text="Tik ištraukti domenus", command=lambda: self.start("extract"))
        self.extract_button.pack(side="left", padx=10)
        self.export_button = ttk.Button(actions, text="Eksportuoti išsaugotus", command=lambda: self.start("export"))
        self.export_button.pack(side="left")
        self.stop_button = ttk.Button(actions, text="Stabdyti", state="disabled", command=self.request_stop)
        self.stop_button.pack(side="left", padx=10)
        ttk.Button(actions, text="Atidaryti CSV", command=self.open_csv).pack(side="right")
        self.progress = ttk.Progressbar(outer, maximum=100)
        self.progress.pack(fill="x", pady=(18, 7))
        ttk.Label(outer, textvariable=self.status).pack(anchor="w")
        ttk.Button(outer, text='TOP strategijų CSV', command=self.open_finalists).pack(anchor='e')
        ttk.Button(outer, text='AI apdorojimo eilė', command=self.open_priority).pack(anchor='e')
        ttk.Label(outer, text="Geriausi iš jau įvertintų domenų", font=("Segoe UI", 12, "bold")).pack(anchor="w", pady=(18, 8))
        table = ttk.Frame(outer)
        table.pack(fill="both", expand=True)
        columns = ("domain", "score", "keyword", "category", "niche")
        self.tree = ttk.Treeview(table, columns=columns, show="headings", height=8)
        for key, label, width in zip(columns, ["Domenas", "Potencialas", "Raktažodis / 5", "Kategorija", "Niša"], [245, 90, 110, 235, 250]):
            self.tree.heading(key, text=label)
            self.tree.column(key, width=width, minwidth=70, anchor="w" if key not in ("score", "keyword") else "e")
        scrollbar = ttk.Scrollbar(table, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        self.tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        self.log = tk.Text(outer, height=5, background="#ffffff", foreground="#475569", relief="flat",
                           font=("Consolas", 9), wrap="word", state="disabled")
        self.log.pack(fill="x", pady=(12, 0))
        ttk.Label(outer, text="Balai yra AI hipotezės pagal pavadinimą. Paieškos apimtys, realios maržos ir domenų istorija dar netikrintos.",
                  wraplength=1040).pack(anchor="w", pady=(10, 0))
        root.protocol("WM_DELETE_WINDOW", self.close)
        root.after(200, self.poll)
        self.refresh_table()

    def pick_input(self):
        path = filedialog.askopenfilename(filetypes=[("Tekstiniai failai", "*.txt"), ("Visi failai", "*.*")])
        if path:
            self.input.set(path)

    def pick_output(self):
        path = filedialog.asksaveasfilename(defaultextension=".xls", filetypes=[("Excel 97–2003", "*.xls")])
        if path:
            self.output.set(path)

    def start(self, mode):
        if self.worker and self.worker.is_alive():
            return
        try:
            options = Options(input=Path(self.input.get()), output=Path(self.output.get()),
                              model=self.model.get().strip() or None, batch_size=int(self.batch.get()),
                              workers=int(self.workers.get()), limit=int(self.limit.get()),
                              extract_only=mode == "extract", export_only=mode == "export")
        except ValueError:
            messagebox.showerror("Netinkami nustatymai", "Grupės dydis, procesai ir limitas turi būti sveiki skaičiai.")
            return
        self.stop.clear()
        self.set_busy(True)
        self.status.set("Skaitomas šaltinis ir išsaugota eiga…")

        def work():
            try:
                result = run_pipeline(options, report=lambda text: self.messages.put(("log", text)), stop=self.stop)
                self.messages.put(("done", result))
            except (AppError, CodexError) as exc:
                self.messages.put(("error", str(exc)))
            except Exception:
                self.messages.put(("error", "Netikėta klaida. Patikrinkite failų prieigą ir Codex CLI prisijungimą."))
        self.worker = threading.Thread(target=work, daemon=True)
        self.worker.start()

    def set_busy(self, value):
        for button in (self.start_button, self.extract_button, self.export_button):
            button.configure(state="disabled" if value else "normal")
        self.stop_button.configure(state="normal" if value else "disabled")

    def request_stop(self):
        self.stop.set()
        self.status.set("Stabdoma; jau gauti rezultatai bus išsaugoti…")

    def refresh_table(self):
        db = Path(self.output.get()).parent / "analysis.sqlite3"
        if not db.exists():
            return
        try:
            with sqlite3.connect(f"file:{db.as_posix()}?mode=ro", uri=True) as connection:
                try:
                    summary = json.loads((db.parent / 'run_summary.json').read_text(encoding='utf-8'))
                except (OSError, ValueError):
                    summary = {}
                signature = signature_for(self.model.get().strip() or configured_model(),
                                          summary.get('evaluation_stage', 'screen'))
                items = [json.loads(row[0]) for row in connection.execute("SELECT payload FROM analysis WHERE signature=?", (signature,))]
            self.tree.delete(*self.tree.get_children())
            for item in ranked(items)[:100]:
                self.tree.insert("", "end", values=(item["domain"], item["score"], item["k"], CATEGORIES[item["c"]], item["n"]))
        except (sqlite3.Error, OSError):
            pass

    def poll(self):
        refresh = False
        while True:
            try:
                kind, data = self.messages.get_nowait()
            except queue.Empty:
                break
            if kind == "log":
                self.log.configure(state="normal")
                self.log.insert("end", data + "\n")
                if int(self.log.index("end-1c").split(".")[0]) > 150:
                    self.log.delete("1.0", "30.0")
                self.log.see("end")
                self.log.configure(state="disabled")
                self.status.set(data)
                match = re.search(r"AI: ([\d,]+)/([\d,]+)", data)
                if match:
                    done, total = (int(x.replace(",", "")) for x in match.groups())
                    self.progress["value"] = done / total * 100
                    refresh = True
            elif kind == 'csv':
                self.csv_busy = False
                if data:
                    self.status.set(f"CSV atnaujintas: {data['categorized']:,}/{data['total']:,} įvertinta.")
                    os.startfile(str((Path(self.output.get()).parent / 'domenai_reitingas.csv').resolve()))
            elif kind == 'csv_error':
                self.csv_busy = False
                messagebox.showerror('CSV eksportas', data)
            else:
                self.set_busy(False)
                refresh = True
                if kind == "error":
                    self.status.set(data)
                    messagebox.showerror("Darbas sustabdytas", data)
                else:
                    self.status.set(f"Eksportas atliktas. AI: {data['categorized']:,}/{data['total']:,}. Būsena: {data['status']}.")
                    self.progress["value"] = data["categorized"] / data["total"] * 100
        if refresh:
            self.refresh_table()
        if time.monotonic() - self.last_external_refresh >= 5 and not (self.worker and self.worker.is_alive()):
            self.monitor_external_run()
            self.last_external_refresh = time.monotonic()
        self.root.after(300, self.poll)

    def monitor_external_run(self):
        directory = Path(self.output.get()).parent
        try:
            state = read_status(directory)
        except (OSError, ValueError, KeyError, sqlite3.Error):
            return
        count, total = state['categorized'], state['total']
        if state['phase'] == 'strategy' and state['strategy_total']:
            count, total = state['strategy_categorized'], state['strategy_total']
        self.progress['value'] = count / max(total, 1) * 100
        if state['process_active']:
            self.set_busy(True)
            self.stop_button.configure(state='disabled')
            label = 'TOP strategijos' if state['phase'] == 'strategy' else 'Pirminė atranka'
            self.status.set(f'{label} vyksta kitame procese: {count:,}/{total:,}.')
            self.refresh_table()
        else:
            self.set_busy(False)
            if state['status'] == 'interrupted':
                self.status.set(f'Analizė nutrūko: išsaugota {count:,}/{total:,}. Galima tęsti.')
            elif state['status'] == 'complete':
                self.status.set(f'Analizė baigta: {count:,}/{total:,}.')
            elif state['status'] in ('partial', 'error', 'stopped'):
                extra = (f" {state['deferred_count']} atsakymų reikia pakartotinės patikros."
                         if state.get('deferred_count') else '')
                self.status.set(f"Analizė nebaigta ({state['status']}): išsaugota {count:,}/{total:,}."
                                + extra + ' Galima tęsti.')

    def open_xls(self):
        path = Path(self.output.get())
        if not path.exists():
            messagebox.showinfo("XLS dar nėra", "Pirma ištraukite domenus arba pradėkite kategorizavimą.")
        else:
            os.startfile(str(path.resolve()))

    def open_csv(self):
        if self.csv_busy:
            return
        self.csv_busy = True
        source = Path(self.input.get())
        directory = Path(self.output.get()).parent
        model = self.model.get().strip() or configured_model()

        def work():
            try:
                result = export_snapshot(source, directory, model)
                if result is None:
                    raise AppError('CSV šiuo metu atnaujina kitas procesas. Pakartokite po kelių sekundžių.')
                self.messages.put(('csv', result))
            except AppError as exc:
                self.messages.put(('csv_error', str(exc)))
        threading.Thread(target=work, daemon=True).start()

    def open_finalists(self):
        path = Path(self.output.get()).parent / 'finalists/domenai_reitingas.csv'
        if path.exists():
            os.startfile(str(path.resolve()))
        else:
            messagebox.showinfo('TOP strategijos', 'Išsamus finalistų etapas prasidės baigus visų domenų pirminę atranką.')

    def open_priority(self):
        path = Path(self.output.get()).parent / 'domenai_ai_eile.csv'
        if path.exists():
            os.startfile(str(path.resolve()))
        else:
            messagebox.showinfo('AI eilė', 'Pradėjus darbą visi domenai bus surikiuoti pagal pavadinimą prieš AI vertinimą.')

    def close(self):
        if self.worker and self.worker.is_alive():
            self.request_stop()
            self.root.after(300, self.finish_close)
        else:
            self.root.destroy()

    def finish_close(self):
        if self.worker and self.worker.is_alive():
            self.root.after(300, self.finish_close)
        else:
            self.root.destroy()


if __name__ == "__main__":
    root = tk.Tk()
    DomainApp(root)
    root.mainloop()
