# دليل استكشاف الأخطاء وحلها 🔧

## الخطوة 1: تحديث الإضافة في Chrome

إذا كانت الإضافة مثبتة مسبقاً، يجب **إعادة تحميلها** لتطبيق التحديثات الجديدة:

1. افتح `chrome://extensions/`
2. ابحث عن "FPL Purchase Price Info"
3. اضغط على أيقونة **إعادة التحميل** (↻) الدائرية
4. أو اضغط على زر **Remove** ثم أعد تحميلها بزر **Load unpacked**

## الخطوة 2: التحقق من تفعيل الإضافة

✅ يجب أن يكون المفتاح بجانب اسم الإضافة **أزرق** (مفعّل)
❌ إذا كان رمادي، اضغط عليه لتفعيل الإضافة

## الخطوة 3: فتح Console للمراقبة

1. افتح موقع https://fantasy.premierleague.com/
2. اضغط `F12` لفتح أدوات المطور
3. انتقل إلى تبويب **Console**
4. يجب أن ترى الرسائل التالية:
   ```
   🟢 FPL Purchase Price Extension: Starting...
   👀 Setting up MutationObserver...
   ✅ Observer active and monitoring for dialogs
   ✅ FPL Purchase Price Info Extension fully loaded!
   ```

## الخطوة 4: فتح صفحة لاعب واختبار

1. اذهب إلى صفحة **Statistics** أو **Transfers**
2. اضغط على أيقونة **i** لأي لاعب
3. راقب Console - يجب أن ترى:
   ```
   🎯 Player dialog detected!
   🔍 Extracting player info from dialog...
   🖼️ Player image found: https://...
   ✅ Player ID extracted: 204480
   🔍 Attempting to get Team ID...
   ```

### إذا ظهرت رسالة طلب Team ID:
- أدخل معرف فريقك من fpl.team (مثل `3022172`)
- اضغط OK
- سيتم حفظه تلقائياً

### بعد إدخال Team ID:
يجب أن ترى في Console:
```
📡 Fetching from: https://fpl.team/plan/3022172/
✅ HTML fetched, length: 123456
✅ Player data found: {purchasePrice: "6.6", sellPrice: "6.8", currentPrice: "7.1"}
✅ Purchase info added successfully!
```

## المشاكل الشائعة وحلولها

### ❌ لا تظهر رسائل Extension في Console

**الحل:**
- تأكد من تفعيل الإضافة في `chrome://extensions/`
- أعد تحميل الصفحة (F5)
- أعد تحميل الإضافة من `chrome://extensions/`

### ❌ تظهر رسالة "Player not found in team data"

**السبب:** اللاعب ليس في فريقك على fpl.team

**الحل:** الإضافة تعمل فقط مع اللاعبين الموجودين في فريقك

### ❌ تظهر رسالة CORS error

**الحل:**
1. تأكد من السماح بـ host permissions في manifest.json
2. في `chrome://extensions/` ← تفاصيل الإضافة ← Site access ← اختر "On all sites"

### ❌ تظهر رسالة "Stats container not found"

**السبب:** تغيير في بنية HTML للموقع

**الحل:** أبلغني وسأقوم بتحديث الـ selectors

### ❌ لا تظهر المعلومات حتى مع رسائل نجاح في Console

**الحل:**
1. افحص Console للتأكد من عدم وجود أخطاء CSS
2. افحص العنصر بـ Inspect Element وابحث عن `.fpl-purchase-info`
3. تأكد من تحميل ملف `styles.css`

## اختبار سريع - Checklist ✓

- [ ] الإضافة مفعّلة في chrome://extensions/
- [ ] رسالة "Extension fully loaded" تظهر في Console
- [ ] Team ID تم إدخاله وحفظه
- [ ] صفحة اللاعب مفتوحة في dialog
- [ ] اللاعب موجود في فريقك على fpl.team
- [ ] رسالة "Purchase info added successfully" ظهرت

## تغيير Team ID

إذا أدخلت Team ID خاطئ:

افتح Console واكتب:
```javascript
localStorage.removeItem('fpl_extension_team_id');
location.reload();
```

## طلب المساعدة

إذا استمرت المشكلة:
1. التقط صورة شاشة للـ Console بعد فتح صفحة لاعب
2. أرسلها مع وصف المشكلة
3. اذكر Team ID الخاص بك
