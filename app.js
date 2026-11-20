(() => {
  const D = window.MENU_DATA, $ = s => document.querySelector(s);
  const nf = v => Number(v).toLocaleString("ar-EG");
  const money = v => nf(v) + " " + D.currency;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const toEn = s => String(s).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  const item = id => D.items.find(i => i.id === id);
  const extra = id => D.extras.find(e => e.id === id);
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* التخزين غير متاح */ } }
  };

  let cart = store.get("lib-cart", []).filter(l => item(l.id) && item(l.id).variants[l.v]);
  const cust = Object.assign({ type: "delivery", name: "", phone: "", address: "", table: "", note: "" }, store.get("lib-cust", {}));
  const unit = l => item(l.id).variants[l.v].price + l.ex.reduce((s, e) => s + (extra(e) ? extra(e).price : 0), 0);
  const lineTotal = l => unit(l) * l.q;
  const total = () => cart.reduce((s, l) => s + lineTotal(l), 0);
  const count = () => cart.reduce((s, l) => s + l.q, 0);
  const sig = l => [l.id, l.v, l.ex.join(","), l.ch, l.note].join("|");

  /* ---------- الهيدر والفوتر ---------- */
  document.title = D.restaurantName + " | المنيو";
  ["call", "foot-call"].forEach(id => { $("#" + id).href = "tel:" + D.phone; });
  $("#call-text").textContent = D.phoneDisplay;
  $("#foot-call").textContent = D.phoneDisplay;
  $("#addr").textContent = D.address;
  $("#foot-addr").textContent = D.address;
  $("#map").href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(D.restaurantName + " " + D.address);

  /* ---------- عرض المنيو ---------- */
  const chips = $("#chips");
  D.categories.forEach(c => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.dataset.key = c.key;
    b.innerHTML = `<img src="${c.img}" alt="" width="28" height="28"><span>${c.name}</span>`;
    b.addEventListener("click", () => { const s = $("#cat-" + c.key); if (s) s.scrollIntoView({ behavior: "smooth", block: "start" }); });
    chips.appendChild(b);
  });

  function row(i) {
    const multi = i.variants.length > 1, from = Math.min(...i.variants.map(v => v.price));
    const tag = multi ? i.variants.map(v => v.label).join(" • ") : (i.variants[0].label ? i.variants[0].label + " فقط" : "");
    return `<li><button type="button" class="item" data-id="${i.id}"><span class="item-main"><b>${i.name}</b>` +
      (i.desc ? `<small>${i.desc}</small>` : "") + (tag ? `<em>${tag}</em>` : "") +
      `</span><span class="item-price">${multi ? "من " : ""}${money(from)}</span><span class="add" aria-hidden="true">+</span></button></li>`;
  }

  function renderMenu(term) {
    const t = (term || "").trim().toLocaleLowerCase("ar");
    let shown = 0, html = "";
    D.categories.forEach(c => {
      const list = D.items.filter(i => i.category === c.name && (!t || (i.name + " " + i.desc + " " + c.name).toLocaleLowerCase("ar").includes(t)));
      chips.querySelector(`[data-key="${c.key}"]`).hidden = !list.length;
      if (!list.length) return;
      shown += list.length;
      let g = "", rows = "";
      list.forEach(i => { if (i.group && i.group !== g) { g = i.group; rows += `<li class="group">${g}</li>`; } rows += row(i); });
      html += `<section class="cat" id="cat-${c.key}" data-key="${c.key}"><h2 class="cat-title"><img src="${c.img}" alt="" width="46" height="46"><span>${c.name}</span><small>${nf(list.length)} صنف</small></h2><ul class="items">${rows}</ul></section>`;
    });
    $("#menu").innerHTML = html;
    $("#empty").hidden = shown > 0;
    badges(); spy();
  }

  function badges() {
    document.querySelectorAll(".item").forEach(b => {
      const q = cart.filter(l => l.id === +b.dataset.id).reduce((s, l) => s + l.q, 0);
      b.querySelector(".add").textContent = q ? nf(q) : "+";
    });
  }

  let observer;
  function spy() {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      chips.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c.dataset.key === e.target.dataset.key));
      const on = chips.querySelector(".chip.on"); if (on) on.scrollIntoView({ inline: "center", block: "nearest" });
    }), { rootMargin: "-130px 0px -70% 0px" });
    document.querySelectorAll(".cat").forEach(s => observer.observe(s));
  }

  $("#search").addEventListener("input", e => renderMenu(e.target.value));
  $("#menu").addEventListener("click", e => { const b = e.target.closest(".item"); if (b) openItem(item(+b.dataset.id)); });

  /* ---------- أدوات عامة ---------- */
  let toastTimer;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1800); }
  function sync() {
    store.set("lib-cart", cart);
    $("#cartbar").hidden = !cart.length;
    $("#cb-count").textContent = nf(count());
    $("#cb-total").textContent = money(total());
    badges();
  }
  function merge() {
    const out = [];
    cart.forEach(l => { const m = out.find(o => sig(o) === sig(l)); if (m) m.q += l.q; else out.push(l); });
    cart = out;
  }
  document.querySelectorAll("dialog").forEach(d => d.addEventListener("click", e => { if (e.target === d || e.target.closest("[data-close]")) d.close(); }));

  /* ---------- نافذة الصنف ---------- */
  function openItem(it, editIdx = -1, fromCart = false) {
    const base = editIdx >= 0 ? cart[editIdx] : null;
    const st = base ? { v: base.v, ex: new Set(base.ex), ch: base.ch, q: base.q, note: base.note } : { v: 0, ex: new Set(), ch: "", q: 1, note: "" };
    const dlg = $("#item-dialog");
    const price = () => (it.variants[st.v].price + [...st.ex].reduce((s, e) => s + extra(e).price, 0)) * st.q;
    const multi = it.variants.length > 1;

    dlg.innerHTML = `
      <div class="sheet-head"><div><h3>${it.name}</h3>${it.desc ? `<p>${it.desc}</p>` : ""}</div><button class="x" type="button" data-close aria-label="إغلاق">×</button></div>
      <div class="sheet-body">
        ${multi ? `<div><p class="field-title">اختار الحجم / النوع <span>مطلوب</span></p><div class="pills">${it.variants.map((v, i) =>
          `<label class="pill"><input type="radio" name="v" value="${i}" ${i === st.v ? "checked" : ""}><span>${v.label}<small>${money(v.price)}</small></span></label>`).join("")}</div></div>`
          : (it.variants[0].label ? `<p class="note">متاح بالنوع: ${it.variants[0].label}</p>` : "")}
        ${it.choose ? `<div><p class="field-title">اختار السلطة <span>مطلوب</span></p><div class="pills">${it.choose.map(s =>
          `<label class="pill"><input type="radio" name="ch" value="${s}" ${s === st.ch ? "checked" : ""}><span>${s}</span></label>`).join("")}</div></div>` : ""}
        ${it.extras.length ? `<div><p class="field-title">إضافات <span>اختياري</span></p>${it.extras.map(id => { const e = extra(id);
          return `<label class="opt"><input type="checkbox" name="ex" value="${id}" ${st.ex.has(id) ? "checked" : ""}><span>${e.name}<b>+ ${money(e.price)}</b></span></label>`; }).join("")}</div>` : ""}
        <div class="field-title" style="margin:0">الكمية <div class="stepper"><button type="button" data-q="-1" aria-label="قلّل">−</button><b id="q">${nf(st.q)}</b><button type="button" data-q="1" aria-label="زوّد">+</button></div></div>
        <div><p class="field-title">ملاحظات على الصنف</p><textarea rows="2" placeholder="مثال: من غير بصل، حار، زيادة صوص..."></textarea></div>
      </div>
      <div class="sheet-foot"><button class="cta" type="button" id="go"><span id="go-t"></span><span id="go-p"></span></button></div>`;

    const ta = dlg.querySelector("textarea"); ta.value = st.note;
    ta.addEventListener("input", () => { st.note = ta.value; });
    const go = dlg.querySelector("#go");
    function refresh() {
      dlg.querySelector("#q").textContent = nf(st.q);
      const blocked = it.choose && !st.ch;
      go.disabled = !!blocked;
      dlg.querySelector("#go-t").textContent = blocked ? "اختار السلطة الأول" : (base ? "حفظ التعديل" : "أضف للطلب");
      dlg.querySelector("#go-p").textContent = money(price());
    }
    dlg.onchange = e => {
      const t = e.target;
      if (t.name === "v") st.v = +t.value; else if (t.name === "ch") st.ch = t.value;
      else if (t.name === "ex") { t.checked ? st.ex.add(t.value) : st.ex.delete(t.value); }
      refresh();
    };
    dlg.querySelectorAll("[data-q]").forEach(b => b.addEventListener("click", () => { st.q = Math.min(50, Math.max(1, st.q + +b.dataset.q)); refresh(); }));
    go.addEventListener("click", () => {
      const line = { id: it.id, v: st.v, ex: [...st.ex].sort(), ch: st.ch, note: st.note.trim(), q: st.q };
      if (base) cart[editIdx] = line; else cart.push(line);
      merge(); sync(); dlg.close();
      if (fromCart) openCart(); else toast("اتضاف للطلب ✓");
    });
    refresh();
    if (!dlg.open) dlg.showModal();
  }

  /* ---------- نافذة الطلب ---------- */
  function openCart() {
    const dlg = $("#cart-dialog");
    if (!cart.length) { if (dlg.open) dlg.close(); return; }
    const lines = cart.map((l, i) => {
      const it = item(l.id), v = it.variants[l.v];
      return `<div class="line" data-i="${i}"><div class="line-top"><b>${it.name}${v.label ? " (" + v.label + ")" : ""}</b><span>${money(lineTotal(l))}</span></div>
        ${l.ex.length ? `<small>+ ${l.ex.map(e => extra(e).name).join("، ")}</small>` : ""}
        ${l.ch ? `<small>سلطة: ${esc(l.ch)}</small>` : ""}${l.note ? `<small>ملاحظة: ${esc(l.note)}</small>` : ""}
        <div class="line-actions"><div class="stepper"><button type="button" data-act="dec" aria-label="قلّل">−</button><b>${nf(l.q)}</b><button type="button" data-act="inc" aria-label="زوّد">+</button></div>
        <span><button type="button" class="link" data-act="edit">تعديل</button><button type="button" class="link del" data-act="del">حذف</button></span></div></div>`;
    }).join("");
    const del = cust.type === "delivery";
    dlg.innerHTML = `
      <div class="sheet-head"><div><h3>طلبك</h3><p>${nf(count())} صنف</p></div><div><button type="button" class="link del" data-act="clear">مسح الكل</button><button class="x" type="button" data-close aria-label="إغلاق">×</button></div></div>
      <div class="sheet-body">${lines}
        <div class="total"><span>إجمالي الأصناف</span><span>${money(total())}</span></div>
        <p class="note">رسوم التوصيل (لو فيه) بتتحدد وقت تأكيد الطلب.</p>
        <div class="seg order-types">
          <label><input type="radio" name="type" value="delivery" ${cust.type === "delivery" ? "checked" : ""}><span>🛵 توصيل</span></label>
          <label><input type="radio" name="type" value="pickup" ${cust.type === "pickup" ? "checked" : ""}><span>🛍️ استلام</span></label>
          <label><input type="radio" name="type" value="dinein" ${cust.type === "dinein" ? "checked" : ""}><span>🍽️ في المطعم</span></label>
        </div>
        <div class="form">
          <label class="f" id="table-f" ${cust.type === "dinein" ? "" : "hidden"}>اختار رقم الترابيزة
            <select class="input" name="table"><option value="">اختار الترابيزة</option>${(D.tableNumbers || Array.from({length: D.tableCount || 20}, (_,i) => i+1)).map(n => `<option value="${esc(n)}" ${String(cust.table) === String(n) ? "selected" : ""}>ترابيزة ${esc(n)}</option>`).join("")}</select>
          </label>
          <label class="f">الاسم<input class="input" name="name" autocomplete="name" value="${esc(cust.name)}"></label>
          <label class="f">رقم التليفون<input class="input" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="01XXXXXXXXX" value="${esc(cust.phone)}"></label>
          <label class="f" id="addr-f" ${del ? "" : "hidden"}>العنوان بالتفصيل<textarea name="address" rows="2" placeholder="الشارع، رقم العمارة، الدور، علامة مميزة">${esc(cust.address)}</textarea></label>
          <label class="f">ملاحظات عامة على الطلب<textarea name="note" rows="2">${esc(cust.note)}</textarea></label>
        </div>
      </div>
      <div class="sheet-foot"><div style="flex:1"><p class="hint" id="err" role="alert"></p><button class="cta wa" type="button" id="send">ابعت الطلب على واتساب</button></div></div>`;
    dlg.querySelector(".sheet-body").scrollTop = 0;
    if (!dlg.open) dlg.showModal();
  }

  $("#cart-dialog").addEventListener("click", e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const line = b.closest(".line"), i = line ? +line.dataset.i : -1, act = b.dataset.act;
    if (act === "clear") { if (confirm("مسح كل الأصناف من الطلب؟")) { cart = []; sync(); $("#cart-dialog").close(); } return; }
    if (act === "inc") cart[i].q = Math.min(50, cart[i].q + 1);
    else if (act === "dec") cart[i].q -= 1;
    else if (act === "del") cart.splice(i, 1);
    else if (act === "edit") { const l = cart[i]; $("#cart-dialog").close(); openItem(item(l.id), i, true); return; }
    cart = cart.filter(l => l.q > 0); sync(); openCart();
  });
  $("#cart-dialog").addEventListener("input", e => { if (e.target.name in cust) { cust[e.target.name] = e.target.value; store.set("lib-cust", cust); } });
  $("#cart-dialog").addEventListener("change", e => {
    if (e.target.name === "type") {
      cust.type = e.target.value;
      store.set("lib-cust", cust);
      $("#addr-f").hidden = cust.type !== "delivery";
      $("#table-f").hidden = cust.type !== "dinein";
    }
    if (e.target.name === "table") { cust.table = e.target.value; store.set("lib-cust", cust); }
  });
  $("#cart-dialog").addEventListener("click", e => { if (e.target.id === "send") beginCheckout(); });

  let paymentMethod = "instapay";
  function checkoutError(msg, name) {
    const dlg = $("#cart-dialog"), err = dlg.querySelector("#err");
    if (err) err.textContent = msg;
    const f = name && dlg.querySelector(`[name="${name}"]`);
    if (f) f.focus();
  }
  function beginCheckout() {
    const phone = toEn(cust.phone).replace(/[\s-]/g, "");
    if (!cust.name.trim()) return checkoutError("اكتب اسمك من فضلك.", "name");
    if (!/^01[0125]\d{8}$/.test(phone)) return checkoutError("رقم التليفون لازم يكون 11 رقم ويبدأ بـ 01.", "phone");
    if (cust.type === "delivery" && cust.address.trim().length < 6) return checkoutError("اكتب العنوان بالتفصيل عشان نوصلك.", "address");
    if (cust.type === "dinein" && !cust.table) return checkoutError("اختار رقم الترابيزة من فضلك.", "table");
    const number = String(D.whatsappNumber || "").replace(/\D/g, "");
    if (!number || String(D.whatsappNumber).includes("X") || number.length < 10) return checkoutError("رقم واتساب المطعم غير مضبوط في menu-data.js.", "name");
    cust.phone = phone; store.set("lib-cust", cust);
    $("#cart-dialog").close();
    openPayment();
  }
  function openPayment() {
    let dlg = $("#payment-dialog");
    if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "payment-dialog"; document.body.appendChild(dlg); }
    const cfg = D.payment || {};
    const amount = total();
    const cash = paymentMethod === "cash";
    const electronic = paymentMethod !== "cash";
    const details = paymentMethod === "instapay" ? (cfg.instaPayId || "لم تتم إضافة عنوان InstaPay بعد") : (cfg.vodafoneCashNumber || "لم يتم إضافة رقم فودافون كاش بعد");
    const methodName = paymentMethod === "instapay" ? "InstaPay" : paymentMethod === "vodafone" ? "Vodafone Cash" : "كاش";
    dlg.innerHTML = `
      <div class="sheet-head"><div><h3>اختار طريقة الدفع</h3><p>إجمالي طلبك: ${money(amount)}</p></div><button class="x" type="button" data-close>×</button></div>
      <div class="sheet-body">
        <div class="payment-options">
          <button type="button" class="pay-card ${paymentMethod==="instapay"?"selected":""}" data-method="instapay"><b>💳 InstaPay</b><small>تحويل لحظي</small></button>
          <button type="button" class="pay-card ${paymentMethod==="vodafone"?"selected":""}" data-method="vodafone"><b>📱 Vodafone Cash</b><small>تحويل من المحفظة</small></button>
          <button type="button" class="pay-card ${cash?"selected":""}" data-method="cash"><b>💵 الدفع نقدًا</b><small>عند الاستلام / داخل المطعم</small></button>
        </div>
        ${electronic ? `<section class="payment-details"><b>بيانات التحويل – ${methodName}</b><p>${esc(details)}</p><p>اسم المستفيد: ${esc(cfg.beneficiaryName || D.restaurantName)}</p>
          <button type="button" class="link" id="copy-payment">نسخ بيانات الدفع</button>
          ${paymentMethod==="instapay" && cfg.instaPayDeepLink ? `<a class="cta payment-open" href="${esc(cfg.instaPayDeepLink)}">الدفع عبر InstaPay</a>` : ""}
          ${paymentMethod==="vodafone" && cfg.vodafoneCashNumber ? `<a class="cta payment-open" href="tel:${esc(cfg.vodafoneCashNumber)}">فتح الاتصال</a>` : ""}
        </section>
        <div class="form">
          <label class="f">رقم العملية (مطلوب)<input class="input" id="transaction-id" autocomplete="off" placeholder="أدخل رقم العملية"></label>
          <label class="f">المبلغ المحوّل<input class="input" id="paid-amount" inputmode="decimal" type="number" min="0" step="0.01" value="${amount}"></label>
          <label class="f">صورة إيصال التحويل (اختياري)<input class="input" id="receipt" type="file" accept="image/*"></label>
          <label class="confirm-payment"><input type="checkbox" id="payment-confirm"> أؤكد أنني قمت بتحويل المبلغ الموضح أعلاه</label>
          <p class="note">تنبيه: إدخال البيانات لا يؤكد وصول الأموال. سيراجع المطعم التحويل يدويًا. صورة الإيصال لا تُرفق تلقائيًا برسالة واتساب؛ أرسلها في المحادثة بعد فتحها.</p>
        </div>` : `<div class="payment-details"><b>الدفع نقدًا</b><p>${cust.type === "delivery" ? "سيتم الدفع نقدًا عند استلام الطلب." : "سيتم الدفع نقدًا داخل المطعم."}</p></div>`}
      </div>
      <div class="sheet-foot payment-footer"><button class="link" type="button" id="back-cart">رجوع للسلة</button><button class="cta wa" type="button" id="confirm-payment-order">${cash?"تأكيد وإرسال الطلب":"تأكيد البيانات وإرسال الطلب"}</button></div>`;
    if (!dlg.open) dlg.showModal();
    dlg.querySelector("[data-close]").addEventListener("click", () => dlg.close());
    dlg.querySelectorAll("[data-method]").forEach(b => b.addEventListener("click", () => { paymentMethod = b.dataset.method; openPayment(); }));
    dlg.querySelector("#back-cart").addEventListener("click", () => { dlg.close(); openCart(); });
    const copy = dlg.querySelector("#copy-payment");
    if (copy) copy.addEventListener("click", async () => {
      const txt = paymentMethod === "instapay" ? (cfg.instaPayId || "") : (cfg.vodafoneCashNumber || "");
      if (!txt) return toast("بيانات الدفع غير مضافة بعد");
      try { await navigator.clipboard.writeText(txt); toast("تم نسخ بيانات الدفع"); } catch { toast("تعذر النسخ، اضغط مطولًا على البيانات"); }
    });
    dlg.querySelector("#confirm-payment-order").addEventListener("click", () => {
      let payment = { method: paymentMethod, amount: cash ? 0 : Number(dlg.querySelector("#paid-amount").value), transactionId: "", status: cash ? "الدفع نقدًا عند الاستلام / داخل المطعم" : "أفاد العميل بإتمام التحويل – في انتظار مراجعة المطعم" };
      if (!cash) {
        payment.transactionId = dlg.querySelector("#transaction-id").value.trim();
        const entered = payment.amount;
        if (!payment.transactionId) return toast("اكتب رقم العملية");
        if (!Number.isFinite(entered) || entered <= 0) return toast("اكتب المبلغ المحوّل");
        if (Math.abs(entered - amount) > 0.009) return toast("المبلغ لازم يساوي إجمالي الطلب: " + money(amount));
        if (!dlg.querySelector("#payment-confirm").checked) return toast("أكد تنفيذ التحويل أولًا");
        const file = dlg.querySelector("#receipt").files[0];
        if (file && file.size > 5 * 1024 * 1024) return toast("حجم صورة الإيصال يجب ألا يتجاوز 5 ميجابايت");
        if (file) payment.receiptName = file.name;
      }
      dlg.close(); sendOrder(payment);
    });
  }
  function sendOrder(payment) {
    const number = String(D.whatsappNumber || "").replace(/\D/g, "");
    const L = ["طلب جديد من " + D.restaurantName, "", "بيانات العميل:", "الاسم: " + cust.name.trim(), "رقم الهاتف: " + cust.phone,
      "نوع الطلب: " + (cust.type === "delivery" ? "توصيل" : cust.type === "pickup" ? "استلام من المطعم" : "تناول داخل المطعم")];
    if (cust.type === "delivery") L.push("العنوان: " + cust.address.trim());
    if (cust.type === "dinein") L.push("رقم الترابيزة: " + cust.table);
    L.push("", "تفاصيل الطلب:");
    cart.forEach((l, i) => {
      const it = item(l.id), v = it.variants[l.v];
      L.push(nf(i + 1) + ") " + it.name + (v.label ? " (" + v.label + ")" : "") + " × " + nf(l.q));
      if (l.ex.length) L.push("   الإضافات: " + l.ex.map(e => extra(e).name).join("، "));
      if (l.ch) L.push("   سلطة: " + l.ch);
      if (l.note) L.push("   ملاحظة: " + l.note);
      L.push("   السعر: " + money(lineTotal(l)));
    });
    L.push("", "إجمالي الأصناف: " + money(total()), "", "بيانات الدفع:",
      "طريقة الدفع: " + (payment.method === "instapay" ? "InstaPay" : payment.method === "vodafone" ? "Vodafone Cash" : "كاش"));
    if (payment.method === "cash") L.push("حالة الدفع: " + payment.status, "الإجمالي المطلوب: " + money(total()));
    else L.push("المبلغ الذي أفاد العميل بتحويله: " + money(payment.amount), "رقم العملية: " + payment.transactionId,
      "حالة الدفع: " + payment.status, "يرجى مراجعة عملية الدفع وتأكيد وصول المبلغ قبل تجهيز الطلب.");
    if (cust.note.trim()) L.push("", "ملاحظات عامة: " + cust.note.trim());
    const url = "https://wa.me/" + number + "?text=" + encodeURIComponent(L.join("\n"));
    const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
  }

  $("#open-cart").addEventListener("click", openCart);
  renderMenu(""); sync();
})();
