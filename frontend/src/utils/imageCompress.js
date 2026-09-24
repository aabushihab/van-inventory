/**
 * يضغط صورة قبل تحويلها لنص base64 وتخزينها بقاعدة البيانات: يصغّر أبعادها لحد أقصى ويعيد ترميزها JPEG
 * بجودة مخفّضة. يقلّل الحجم النموذجي من عدة ميجابايت لعشرات-مئات الكيلوبايت، لأن كل صورة مخزّنة
 * كنص TEXT بنفس جدول السجل (منتج/مصروف/راتب...) وتُجلب كاملة مع كل قائمة تعرضها - راجع نقاش الأداء
 * حول تخزين الصور كـ base64 داخل القاعدة بدل نظام ملفات منفصل.
 */
export function compressImage(file, { maxDimension = 1000, quality = 0.75 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('invalid image'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round(height * (maxDimension / width));
            width = maxDimension;
          } else {
            width = Math.round(width * (maxDimension / height));
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
