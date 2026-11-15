const dynamicCategories = [
  {
    "id": "همه",
    "title": "همه"
  },
  {
    "id": "cake",
    "title": "کیک"
  },
  {
    "id": "sweets",
    "title": "شیرینی"
  }
];
const recipesData = [
  {
    "id": 4,
    "slug": "homemade-yazdi-cake",
    "title": "کیک یزدی خانگی بدون نیاز به جوش شیرین",
    "category": "cake",
    "catName": "کیک",
    "prepTime": "۲۰ دقیقه",
    "cookTime": "۱۵ دقیقه",
    "difficulty": "آسان",
    "calories": "۲۱۰ کالری",
    "defaultServings": 12,
    "featured": false,
    "image": "https://cdn.jsdelivr.net/gh/imSinac/digchef-media@main/images/homemade-yazdi-cake.webp",
    "ingredients": [
      {
        "id": 1,
        "name": "آرد قنادی",
        "amount": 250.0,
        "unit": "گرم",
        "fixed": false
      },
      {
        "id": 2,
        "name": "روغن مایع",
        "amount": 0.66,
        "unit": "پیمانه",
        "fixed": false
      },
      {
        "id": 3,
        "name": "ماست غلیظ و پرچرب",
        "amount": 150.0,
        "unit": "گرم",
        "fixed": false
      },
      {
        "id": 4,
        "name": "شکر",
        "amount": 200.0,
        "unit": "گرم",
        "fixed": false
      },
      {
        "id": 5,
        "name": "تخم‌مرغ",
        "amount": 3.0,
        "unit": "عدد",
        "fixed": false
      },
      {
        "id": 6,
        "name": "بیکینگ پودر",
        "amount": 1.0,
        "unit": "قاشق غذاخوری",
        "fixed": false
      },
      {
        "id": 7,
        "name": "وانیل",
        "amount": 0.25,
        "unit": "قاشق چای‌خوری",
        "fixed": false
      },
      {
        "id": 8,
        "name": "عسل",
        "amount": 1.0,
        "unit": "قاشق غذاخوری",
        "fixed": false
      },
      {
        "id": 9,
        "name": "گلاب",
        "amount": 1.0,
        "unit": "قاشق غذاخوری",
        "fixed": false
      },
      {
        "id": 10,
        "name": "پودر هل",
        "amount": 0.5,
        "unit": "قاشق چای‌خوری",
        "fixed": false
      },
      {
        "id": 11,
        "name": "کنجد",
        "amount": 0.0,
        "unit": "به میزان لازم",
        "fixed": true
      }
    ],
    "steps": [
      {
        "title": "مرحله اول: آماده‌سازی اولیه",
        "text": "نیم ساعت قبل از شروع کار، تمام مواد را از یخچال خارج کنید تا به دمای محیط برسند و فِر را روی دمای ۲۱۰ درجه سانتی‌گراد روشن کنید تا گرم شود.",
        "audio": "https://cdn.jsdelivr.net/gh/imSinac/digchef-media@main/audio/homemade-yazdi-cake-step-1.wav"
      },
      {
        "title": "مرحله دوم: الک کردن مواد خشک",
        "text": "آرد و بیکینگ پودر را با هم مخلوط کنید، سه بار الک کنید تا بافت کیک سبک و پوک شود و کنار بگذارید.",
        "audio": "https://cdn.jsdelivr.net/gh/imSinac/digchef-media@main/audio/homemade-yazdi-cake-step-2.wav"
      },
      {
        "title": "مرحله سوم: هم زدن تخم‌مرغ و شکر",
        "text": "تخم‌مرغ‌ها و وانیل را حدود یک دقیقه با همزن بزنید تا کمی کف کند، سپس شکر را کم‌کم اضافه کرده و شش دقیقه دیگر هم بزنید تا مخلوط حجیم و کش‌دار شود.",
        "audio": "https://cdn.jsdelivr.net/gh/imSinac/digchef-media@main/audio/homemade-yazdi-cake-step-3.wav"
      },
      {
        "title": "مرحله چهارم: افزودن طعم‌دهنده‌ها و روغن",
        "text": "پودر هل، گلاب، عسل و روغن مایع را به مخلوط اضافه کنید و حدود یک تا دو دقیقه دیگر با همزن مخلوط کنید.",
        "audio": "https://cdn.jsdelivr.net/gh/imSinac/digchef-media@main/audio/homemade-yazdi-cake-step-4.wav"
      },
      {
        "title": "مرحله پنجم: اضافه کردن ماست",
        "text": "ماست غلیظ را به مواد بیفزایید و در حد یک دقیقه با همزن بزنید تا مایه یکدست شود.",
        "audio": "https://cdn.jsdelivr.net/gh/imSinac/digchef-media@main/audio/homemade-yazdi-cake-step-5.wav"
      },
      {
        "title": "مرحله ششم: افزودن آرد به مایه کیک",
        "text": "همزن برقی را کنار بگذارید، مخلوط آرد و بیکینگ پودر را در سه مرحله روی مواد الک کنید و به آرامی هم بزنید تا هیچ گلوله‌ای باقی نماند.",
        "audio": "https://cdn.jsdelivr.net/gh/imSinac/digchef-media@main/audio/homemade-yazdi-cake-step-6.wav"
      },
      {
        "title": "مرحله هفتم: ریختن در قالب و تزیین",
        "text": "کپسول‌ها را داخل قالب بچینید، تا دو سوم آن‌ها را از مایه کیک پر کنید، روی آن‌ها کنجد بپاشید و با یک چاقو یا قاشق چرب یک علامت بعلاوه روی مایه بیندازید تا وسط کیک گنبدی و پف‌دار شود.",
        "audio": "https://cdn.jsdelivr.net/gh/imSinac/digchef-media@main/audio/homemade-yazdi-cake-step-7.wav"
      },
      {
        "title": "مرحله هشتم: پخت کیک یزدی",
        "text": "قالب را به مدت هشت دقیقه در فر از پیش گرم‌شده با دمای ۲۱۰ درجه قرار دهید تا پف کند، سپس دما را به ۱۷۵ درجه کاهش دهید و پنج تا ده دقیقه دیگر زمان دهید تا مغزپخت شود و در صورت تمایل لحظه آخر چند ثانیه گریل بالا را روشن کنید تا روی کیک طلایی شود.",
        "audio": "https://cdn.jsdelivr.net/gh/imSinac/digchef-media@main/audio/homemade-yazdi-cake-step-8.wav"
      }
    ]
  }
];