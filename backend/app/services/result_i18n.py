"""
Localize offline (and generic) symptom-check result payloads into
English / Hindi (Devanagari) / Hinglish without calling an LLM.
"""
from __future__ import annotations

from typing import Any

import json
from pathlib import Path

_MAP_PATH = Path(__file__).with_name("result_text_map.json")
try:
    _TEXT_MAP: dict[str, dict[str, str]] = json.loads(_MAP_PATH.read_text(encoding="utf-8"))
except Exception:
    _TEXT_MAP = {}

# --- condition / symptom names (KB + common co-occurs) ---
CONDITION = {
    "Abdominal pain": ("पेट दर्द", "Pet dard"),
    "Anxiety": ("चिंता / घबराहट", "Anxiety / ghabrahat"),
    "Back pain": ("कमर दर्द", "Kamar dard"),
    "Bloating/gas": ("पेट फूलना / गैस", "Pet phoolna / gas"),
    "Bloating": ("पेट फूलना", "Pet phoolna"),
    "Blood in stool": ("मल में खून", "Mal mein khoon"),
    "Blood in urine": ("पेशाब में खून", "Peshab mein khoon"),
    "Blurred vision": ("धुंधली नज़र", "Dhundhli nazar"),
    "Chest pain": ("सीने में दर्द", "Seene mein dard"),
    "Chest Pain": ("सीने में दर्द", "Seene mein dard"),
    "Chills": ("ठंड लगना / कंपकंपी", "Thand / kampkampi"),
    "Congestion": ("नाक बंद / जमाव", "Naak band"),
    "Constipation": ("कब्ज", "Kabz"),
    "Cough": ("खाँसी", "Khansi"),
    "Cough (dry)": ("सूखी खाँसी", "Sookhi khansi"),
    "Cough (productive/phlegm)": ("बलगम वाली खाँसी", "Balgam wali khansi"),
    "Depression/low mood": ("उदासी / कम मूड", "Udasi / low mood"),
    "Diarrhea": ("दस्त", "Dast"),
    "diarrhea": ("दस्त", "Dast"),
    "Dizziness": ("चक्कर आना", "Chakkar aana"),
    "Dry skin": ("रूखी त्वचा", "Rookhi twacha"),
    "Ear pain": ("कान दर्द", "Kaan dard"),
    "Excessive bruising": ("ज़्यादा नील / चोट के निशान", "Zyada neel"),
    "Eye redness/irritation": ("आँख लाल / जलन", "Aankh laal / jalan"),
    "Fatigue": ("थकान", "Thakaan"),
    "fatigue": ("थकान", "Thakaan"),
    "Fever": ("बुखार", "Bukhar"),
    "Frequent urination": ("बार-बार पेशाब", "Baar-baar peshab"),
    "Headache": ("सिरदर्द", "Sirdard"),
    "Hearing loss": ("सुनने में कमी", "Sunne mein kami"),
    "Heartburn/acid reflux": ("सीने में जलन / एसिडिटी", "Seene mein jalan / acidity"),
    "High blood pressure symptoms": ("हाई ब्लड प्रेशर के लक्षण", "High BP symptoms"),
    "Hives": ("पित्ती / चकत्ते", "Pitti / chaktte"),
    "Insomnia": ("अनिद्रा", "Neend na aana"),
    "Insomnia/sleep disturbance": ("नींद की समस्या", "Neend ki samasya"),
    "Irregular menstrual cycle": ("अनियमित मासिक धर्म", "Aniyamit periods"),
    "Itching": ("खुजली", "Khujli"),
    "Joint pain": ("जोड़ों का दर्द", "Jodon ka dard"),
    "Loss of appetite": ("भूख न लगना", "Bhookh na lagna"),
    "Loss of smell/taste": ("सूंघने/स्वाद में कमी", "Soonghne/swaad mein kami"),
    "Memory loss/confusion": ("याददाश्त कम / भ्रम", "Yaaddasht kam / bhram"),
    "Migraine": ("माइग्रेन", "Migraine"),
    "Muscle pain/soreness": ("मांसपेशियों में दर्द", "Muscle dard"),
    "Muscle weakness": ("मांसपेशियों में कमज़ोरी", "Muscle kamzori"),
    "Nausea": ("मिचली", "Michi / nausea"),
    "nausea": ("मिचली", "Michi / nausea"),
    "Neck stiffness": ("गर्दन अकड़ना", "Gardan akadna"),
    "Night sweats": ("रात को पसीना", "Raat ko paseena"),
    "Numbness/tingling in limbs": ("अंगों में सुन्न / झुनझुनी", "Sunn / jhunjhuni"),
    "Painful urination": ("पेशाब में जलन/दर्द", "Peshab mein jalan"),
    "Palpitations (irregular heartbeat)": ("धड़कन तेज़ / अनियमित", "Dhadkan tez"),
    "Rash": ("चकत्ता / रैश", "Rash / chakta"),
    "Runny/stuffy nose": ("नाक बहना / बंद", "Naak bahna / band"),
    "Seizure": ("दौरा / मिर्गी जैसे लक्षण", "Daura"),
    "Sensitivity to light": ("रोशनी से तकलीफ", "Roshni se takleef"),
    "Shortness of breath": ("साँस फूलना", "Saans phoolna"),
    "Sore throat": ("गले में खराश", "Gale mein kharash"),
    "Swelling in legs/ankles": ("पैर/टखनों में सूजन", "Pair mein soojan"),
    "Swollen joints": ("जोड़ सूजना", "Jod soojna"),
    "Unexplained weight loss": ("बिना वजह वजन घटना", "Wajan kam hona"),
    "Vomiting": ("उल्टी", "Ulti"),
    "vomiting": ("उल्टी", "Ulti"),
    "Wheezing": ("साँस में घरघराहट", "Saans mein ghar-ghar"),
    "Viral illness (common)": ("वायरल बीमारी (आम)", "Viral illness (aam)"),
    "Stress / fatigue related": ("तनाव / थकान से जुड़ा", "Tanaav / thakaan se juda"),
    "Needs clinical review": ("डॉक्टर से जाँच ज़रूरी", "Doctor se jaanch zaroori"),
    "General discomfort": ("सामान्य बेचैनी", "General bechaini"),
    # UI symptom labels that may appear as condition
    "Body Ache": ("बदन दर्द", "Badan dard"),
    "Runny Nose": ("नाक बहना", "Naak bahna"),
    "Sore Throat": ("गले में खराश", "Gale mein kharash"),
    "Chest Pain": ("सीने में दर्द", "Seene mein dard"),

    "light sensitivity": ("रोशनी से तकलीफ", "roshni se takleef"),
    "Light sensitivity": ("रोशनी से तकलीफ", "roshni se takleef"),
    "body aches": ("बदन दर्द", "badan dard"),
    "Body aches": ("बदन दर्द", "badan dard"),
    "runny nose": ("नाक बहना", "naak bahna"),
    "sneezing": ("छींक", "cheenk"),
    "Sneezing": ("छींक", "cheenk"),
    "abdominal cramping": ("पेट में मरोड़", "pet mein marod"),
    "abdominal discomfort": ("पेट में बेचैनी", "pet mein bechaini"),
    "abdominal pain": ("पेट दर्द", "pet dard"),
    "anxiety": ("चिंता", "anxiety"),
    "appetite changes": ("भूख में बदलाव", "bhookh mein badlav"),
    "belching": ("डकार", "dakaar"),
    "blistering": ("छाले", "chhale"),
    "bloating": ("पेट फूलना", "pet phoolna"),
    "blurred vision": ("धुंधली नज़र", "dhundhli nazar"),
    "chest discomfort": ("सीने में बेचैनी", "seene mein bechaini"),
    "chest pain": ("सीने में दर्द", "seene mein dard"),
    "Chest burning": ("सीने में जलन", "seene mein jalan"),
    "Chest tightness": ("सीने में जकड़न", "seene mein jakdan"),
    "chest tightness": ("सीने में जकड़न", "seene mein jakdan"),
    "coldness in limb": ("अंग में ठंडक", "ang mein thandak"),
    "congestion": ("जमाव", "jamav"),
    "constipation": ("कब्ज", "kabz"),
    "cough": ("खाँसी", "khansi"),
    "cramping": ("मरोड़", "marod"),
    "Cramping": ("मरोड़", "marod"),
    "Daytime fatigue": ("दिन में थकान", "din mein thakaan"),
    "dehydration": ("पानी की कमी", "paani ki kami"),
    "diarrhea": ("दस्त", "dast"),
    "difficulty concentrating": ("ध्यान केंद्रित करने में कठिनाई", "dhyan kendrit karne mein mushkil"),
    "difficulty swallowing": ("निगलने में तकलीफ", "nigalne mein takleef"),
    "discharge": ("स्राव", "sraav"),
    "Disorientation": ("दिशा भ्रम", "direction bhram"),
    "dizziness": ("चक्कर", "chakkar"),
    "ear fullness": ("कान भरा होना", "kaan bhara"),
    "eye discomfort": ("आँख बेचैनी", "aankh bechaini"),
    "fever": ("बुखार", "bukhar"),
    "Flaking": ("पपड़ी / झड़ना", "papdi"),
    "frequency": ("बार-बार होना", "baar-baar"),
    "headache": ("सिरदर्द", "sirdard"),
    "Hearing changes": ("सुनने में बदलाव", "sunne mein badlav"),
    "Heaviness": ("भारीपन", "bhaaripan"),
    "irritability": ("चिड़चिड़ापन", "chidchidapan"),
    "irritability (children)": ("चिड़चिड़ापन (बच्चे)", "chidchidapan (bachche)"),
    "itching": ("खुजली", "khujli"),
    "leg pain": ("पैर दर्द", "pair dard"),
    "light": ("रोशनी", "roshni"),
    "limited range of motion": ("गति सीमित", "gati limited"),
    "loss of appetite": ("भूख न लगना", "bhookh na lagna"),
    "loss of consciousness": ("होश खोना", "hosh khona"),
    "Low mood": ("उदासी", "udasi"),
    "lower abdominal pain": ("निचले पेट में दर्द", "niche pet dard"),
    "mood changes": ("मूड बदलाव", "mood badlav"),
    "muscle jerking": ("मांसपेशी झटके", "muscle jhatke"),
    "Muscle stiffness": ("मांसपेशी अकड़न", "muscle akad"),
    "Nasal congestion": ("नाक बंद", "naak band"),
    "nausea": ("मिचली", "michi"),
    "Neck stiffness": ("गर्दन अकड़ना", "gardan akadna"),
    "numbness": ("सुन्न होना", "sunn"),
    "pain": ("दर्द", "dard"),
    "Pain": ("दर्द", "dard"),
    "poor concentration": ("कम एकाग्रता", "kam ekagrata"),
    "rapid heartbeat": ("तेज़ धड़कन", "tez dhadkan"),
    "rash": ("चकत्ता", "rash"),
    "reduced appetite": ("कम भूख", "kam bhookh"),
    "reduced mobility": ("कम गति", "kam gati"),
    "reduced motion": ("कम हलचल", "kam harkat"),
    "Redness": ("लालिमा", "lalima"),
    "redness": ("लालिमा", "lalima"),
    "Restlessness": ("बेचैनी", "bechaini"),
    "Ringing in ears": ("कान में घंटी", "kaan mein ghanti"),
    "runny nose": ("नाक बहना", "naak bahna"),
    "shivering": ("काँपना", "kampna"),
    "shortness of breath": ("साँस फूलना", "saans phoolna"),
    "sinus pressure": ("साइनस दबाव", "sinus dabav"),
    "skin discoloration": ("त्वचा रंग बदलना", "twacha rang"),
    "skin tightness": ("त्वचा कसी", "twacha kasi"),
    "sneezing": ("छींक", "cheenk"),
    "sore throat": ("गले में खराश", "gale mein kharash"),
    "sound sensitivity": ("आवाज़ से तकलीफ", "awaaz se takleef"),
    "sour taste": ("खट्टा स्वाद", "khatta swaad"),
    "Stiffness": ("अकड़न", "akad"),
    "stiffness": ("अकड़न", "akad"),
    "sweating": ("पसीना", "paseena"),
    "swelling": ("सूजन", "soojan"),
    "Swelling": ("सूजन", "soojan"),
    "swollen glands": ("ग्रंथि सूजन", "granthi soojan"),
    "Tenderness": ("दबाने पर दर्द", "dabane par dard"),
    "thirst": ("प्यास", "pyaas"),
    "tightness": ("जकड़न", "jakdan"),
    "trouble sleeping": ("नींद न आना", "neend na aana"),
    "unsteadiness": ("लड़खड़ाहट", "ladkhadahat"),
    "urgency": ("जल्दी पेशाब", "jaldi peshab"),
    "Urgency": ("जल्दी पेशाब", "jaldi peshab"),
    "visual aura": ("दृश्य आभा", "visual aura"),
    "vomiting": ("उल्टी", "ulti"),
    "Vomiting": ("उल्टी", "ulti"),
    "warmth": ("गर्माहट", "garmahat"),
    "watering": ("पानी आना", "paani aana"),
    "Weakness": ("कमज़ोरी", "kamzori"),
    "weakness": ("कमज़ोरी", "kamzori"),
    "weight loss": ("वजन घटना", "wajan kam"),
    "wheezing": ("घरघराहट", "ghargharahat"),
    "withdrawal": ("दूरी / सिमटना", "door ho jana"),
}

# body locations + pain qualities (context line / tips)
LOC = {
    "Head": ("सिर", "sir"),
    "Chest": ("सीना", "seena"),
    "Stomach": ("पेट", "pet"),
    "Back": ("पीठ", "peeth"),
    "Throat": ("गला", "gala"),
    "Joint / Limb": ("जोड़ / हाथ-पैर", "jod / haath-pair"),
    "Skin": ("त्वचा", "twacha"),
    "Other": ("अन्य", "anya"),
}
PAIN = {
    "Sharp": ("तेज़", "tez"),
    "Dull": ("हल्का", "halka"),
    "Burning": ("जलन", "jalan"),
    "Throbbing": ("धड़कन वाला", "dhadkan wala"),
    "Pressure": ("दबाव", "dabav"),
    "Cramping": ("मरोड़", "marod"),
}

def _pick(pair: tuple[str, str] | None, lang: str, fallback: str) -> str:
    if not pair:
        return fallback
    if lang == "hi":
        return pair[0]
    if lang == "hinglish":
        return pair[1]
    return fallback


def tr_condition(name: str, lang: str) -> str:
    if not name or lang == "en":
        return name
    # exact
    if name in CONDITION:
        return _pick(CONDITION[name], lang, name)
    # case-insensitive
    low = name.lower()
    for k, v in CONDITION.items():
        if k.lower() == low:
            return _pick(v, lang, name)
    return name


def tr_location(name: str, lang: str) -> str:
    if not name or lang == "en":
        return name
    if name in LOC:
        return _pick(LOC[name], lang, name)
    return name


def tr_pain(name: str, lang: str) -> str:
    if not name or lang == "en":
        return name
    if name in PAIN:
        return _pick(PAIN[name], lang, name)
    return name


def _why_together(top: str, lang: str) -> str:
    t = tr_condition(top, lang)
    if lang == "hi":
        return f"अक्सर {t} के साथ दिखता है"
    if lang == "hinglish":
        return f"Aksar {t} ke saath dikhta hai"
    return f"Often seen together with {top}"


def _why_match(lang: str) -> str:
    if lang == "hi":
        return "आपके चुने लक्षणों से मेल खाता है"
    if lang == "hinglish":
        return "Aapke selected symptoms se match karta hai"
    return "Matches your selected symptoms"


def _why_based(lang: str) -> str:
    if lang == "hi":
        return "आपके चुने लक्षणों के आधार पर"
    if lang == "hinglish":
        return "Aapke selected symptoms ke base par"
    return "Based on the symptoms you selected"


def _disclaimer(lang: str, offline: bool = True) -> str:
    if lang == "hi":
        if offline:
            return (
                "यह मेडिकल निदान नहीं है। मेडीस्कैन ज्ञान आधार से ऑफ़लाइन गाइड — "
                "सही देखभाल के लिए डॉक्टर से सलाह लें।"
            )
        return "यह मेडिकल निदान नहीं है। सही देखभाल के लिए डॉक्टर से सलाह लें।"
    if lang == "hinglish":
        if offline:
            return (
                "Yeh medical diagnosis nahi hai. MediScan knowledge base se offline guide — "
                "sahi care ke liye doctor se salah lein."
            )
        return "Yeh medical diagnosis nahi hai. Sahi care ke liye doctor se salah lein."
    if offline:
        return (
            "This is not a medical diagnosis. Offline guide from the MediScan knowledge base — "
            "please consult a doctor for proper care."
        )
    return "This is not a medical diagnosis. Please consult a doctor for proper care."


# phrase-level replacements applied to free-text self_care / causes / tips
_PHRASES_HI = [
    ("Infection (viral/bacterial), inflammation, heat exhaustion, immune response",
     "संक्रमण (वायरल/बैक्टीरियल), सूजन, गर्मी से थकान, प्रतिरक्षा प्रतिक्रिया"),
    ("Rest, fluids, light clothing, paracetamol/acetaminophen per label",
     "आराम करें, तरल पदार्थ लें, हल्के कपड़े पहनें, पैरासिटामोल लेबल के अनुसार"),
    ("Rest, hydrate, and avoid strenuous activity today.",
     "आज आराम करें, पानी पिएँ, और भारी मेहनत से बचें।"),
    ("If fever/pain medicine is needed, check dose with a pharmacist first.",
     "अगर बुखार/दर्द की दवा चाहिए, पहले फार्मासिस्ट से खुराक पूछ लें।"),
    ("Red flags — seek urgent care if:", "खतरे के संकेत — तुरंत डॉक्टर दिखाएँ अगर:"),
    ("Temp above 103°F/39.4°C, stiff neck, confusion, difficulty breathing, seizure",
     "बुखार 103°F/39.4°C से ऊपर, गर्दन अकड़ना, भ्रम, साँस लेने में तकलीफ, दौरा"),
    ("Common causes to discuss with a doctor:", "डॉक्टर से चर्चा करने लायक आम कारण:"),
    ("Supportive home care.", "घरेलू सहायक देखभाल।"),
    ("Basic home care: rest, fluids, and sleep.", "बुनियादी घरेलू देखभाल: आराम, तरल, नींद।"),
    ("Ask a pharmacist before any OTC fever/pain reliever.",
     "कोई भी बुखार/दर्द की दवा लेने से पहले फार्मासिस्ट से पूछें।"),
    ("Rest and drink plenty of water or warm fluids.",
     "आराम करें और खूब पानी या गुनगुना तरल पिएँ।"),
    ("Eat light food and avoid heavy / oily meals for a day.",
     "हल्का खाना खाएँ, एक दिन भारी/तेल वाला भोजन से बचें।"),
    ("Track symptoms for 24–48 hours.", "24–48 घंटे लक्षण नोट करें।"),
    ("See a doctor if it gets worse or new red-flag signs appear.",
     "बिगड़े या नए खतरे के संकेत हों तो डॉक्टर दिखाएँ।"),
    ("See a doctor if symptoms persist or worsen.",
     "लक्षण बने रहें या बिगड़ें तो डॉक्टर दिखाएँ।"),
    ("See a doctor if unsure or worsening", "शक हो या बिगड़े तो डॉक्टर दिखाएँ"),
    ("Many everyday symptoms overlap with mild viral illness",
     "रोज़मर्रा के कई लक्षण हल्की वायरल बीमारी जैसे होते हैं"),
    ("Common when sleep or stress is off", "नींद या तनाव गड़बड़ हो तो आम"),
    ("You noted:", "आपने लिखा:"),
    ("share this with a clinician if you visit one.", "डॉक्टर के पास जाएँ तो यह बताएँ।"),
    ("Pain context:", "दर्द का विवरण:"),
    ("unspecified location", "जगह बताई नहीं"),
    ("Gastritis, IBS, appendicitis, kidney stones, pancreatitis, hernia",
     "गैस्ट्राइटिस, IBS, अपेंडिसाइटिस, किडनी स्टोन, पैन्क्रियाटाइटिस, हर्निया"),
    ("Rest, heat pad, bland diet, hydration, avoid NSAIDs initially",
     "आराम, गर्म सेंक, हल्का भोजन, पानी, शुरुआत में NSAID से बचें"),
    ("Rest and fluids.",
     "\u0906\u0930\u093e\u092e \u0915\u0930\u0947\u0902 \u0914\u0930 \u0924\u0930\u0932 \u0932\u0947\u0902\u0964"),
    ("Monitor symptoms and avoid self-medicating with prescription drugs.",
     "\u0932\u0915\u094d\u0937\u0923 \u0926\u0947\u0916\u0947\u0902; \u0928\u0941\u0938\u094d\u0916\u0947 \u0915\u0940 \u0926\u0935\u093e \u0916\u0941\u0926 \u0938\u0947 \u0928 \u0932\u0947\u0902\u0964"),
    ("Often linked to:",
     "\u0905\u0915\u094d\u0938\u0930 \u091c\u0941\u0921\u093c\u093e \u0939\u094b\u0924\u093e \u0939\u0948:"),
    ("See a doctor if symptoms worsen or last more than a few days.",
     "\u0932\u0915\u094d\u0937\u0923 \u092c\u093f\u0917\u0921\u093c\u0947\u0902 \u092f\u093e \u0915\u0941\u091b \u0926\u093f\u0928\u094b\u0902 \u0938\u0947 \u091c\u093c\u094d\u092f\u093e\u0926\u093e \u0930\u0939\u0947\u0902 \u0924\u094b \u0921\u0949\u0915\u094d\u091f\u0930 \u0926\u093f\u0916\u093e\u090f\u0901\u0964"),
]


_PHRASES_HING = [
    ("Infection (viral/bacterial), inflammation, heat exhaustion, immune response",
     "Infection (viral/bacterial), soojan, garmi se thakaan, immune response"),
    ("Rest, fluids, light clothing, paracetamol/acetaminophen per label",
     "Aaram karo, fluids lo, halka kapda, paracetamol label ke hisaab se"),
    ("Rest, hydrate, and avoid strenuous activity today.",
     "Aaj rest lo, paani piyo, bhaari mehnat se bacho."),
    ("If fever/pain medicine is needed, check dose with a pharmacist first.",
     "Agar bukhar/dard ki dawai chahiye, pehle pharmacist se dose pooch lo."),
    ("Red flags — seek urgent care if:", "Red flags — turant doctor dikhao agar:"),
    ("Temp above 103°F/39.4°C, stiff neck, confusion, difficulty breathing, seizure",
     "Temp 103°F/39.4°C se upar, stiff neck, confusion, saans ki takleef, seizure"),
    ("Common causes to discuss with a doctor:", "Doctor se baat karne layak common causes:"),
    ("Supportive home care.", "Ghar pe supportive care."),
    ("Basic home care: rest, fluids, and sleep.", "Basic ghar care: rest, fluids, neend."),
    ("Ask a pharmacist before any OTC fever/pain reliever.",
     "Koi bhi bukhar/dard dawai se pehle pharmacist se poocho."),
    ("Rest and drink plenty of water or warm fluids.",
     "Rest lo aur khub paani ya gunguna liquid piyo."),
    ("Eat light food and avoid heavy / oily meals for a day.",
     "Halka khana khao, ek din bhaari/oily khane se bacho."),
    ("Track symptoms for 24–48 hours.", "24–48 hours symptoms note karo."),
    ("See a doctor if it gets worse or new red-flag signs appear.",
     "Bigde ya naye red-flag dikhein to doctor dikhao."),
    ("See a doctor if symptoms persist or worsen.",
     "Symptoms rahein ya bigdein to doctor dikhao."),
    ("See a doctor if unsure or worsening", "Shak ho ya bigde to doctor dikhao"),
    ("Many everyday symptoms overlap with mild viral illness",
     "Kai aam symptoms halki viral illness jaisi lagti hain"),
    ("Common when sleep or stress is off", "Neend ya stress kharab ho to common"),
    ("You noted:", "Aapne likha:"),
    ("share this with a clinician if you visit one.", "Doctor ke paas jao to yeh batao."),
    ("Pain context:", "Dard ka context:"),
    ("unspecified location", "location nahi batayi"),
]


def tr_text(text: str, lang: str) -> str:
    if not text or lang == "en":
        return text
    # Full-string map first (KB fields)
    if text in _TEXT_MAP and lang in _TEXT_MAP[text]:
        return _TEXT_MAP[text][lang]
    # Prefix patterns like "Common causes to discuss with a doctor: ..."
    prefixes = {
        "hi": [
            ("Common causes to discuss with a doctor: ", "डॉक्टर से चर्चा करने लायक आम कारण: "),
            ("Red flags — seek urgent care if: ", "खतरे के संकेत — तुरंत डॉक्टर दिखाएँ अगर: "),
            ("You noted: ", "आपने लिखा: "),
            ("Pain context: ", "दर्द का विवरण: "),
            ("Often linked to: ", "अक्सर जुड़ा होता है: "),
        ],
        "hinglish": [
            ("Common causes to discuss with a doctor: ", "Doctor se baat karne layak common causes: "),
            ("Red flags — seek urgent care if: ", "Red flags — turant doctor dikhao agar: "),
            ("You noted: ", "Aapne likha: "),
            ("Pain context: ", "Dard ka context: "),
            ("Often linked to: ", "Aksar juda hota hai: "),
        ],
    }
    for pref_en, pref_loc in prefixes.get(lang, []):
        if text.startswith(pref_en):
            rest = text[len(pref_en):].strip()
            # "Head, Throbbing." style
            if pref_en.startswith("Pain context"):
                parts = [p.strip(" .") for p in rest.replace(".", ",").split(",") if p.strip(" .")]
                translated = []
                for p in parts:
                    if p.lower() == "unspecified location":
                        translated.append("जगह बताई नहीं" if lang == "hi" else "location nahi batayi")
                    else:
                        translated.append(tr_location(p, lang) if p in LOC else tr_pain(p, lang) if p in PAIN else tr_condition(p, lang))
                return pref_loc + ", ".join(translated) + ("।" if lang == "hi" else ".")
            return pref_loc + tr_text(rest, lang)

    out = text
    # exact substring replacements from map (longer first)
    for en in sorted(_TEXT_MAP.keys(), key=len, reverse=True):
        if en in out and lang in _TEXT_MAP[en]:
            out = out.replace(en, _TEXT_MAP[en][lang])
    phrases = _PHRASES_HI if lang == "hi" else _PHRASES_HING
    # longer phrases first
    for en, loc in sorted(phrases, key=lambda x: len(x[0]), reverse=True):
        if en in out:
            out = out.replace(en, loc)
    # leftover "Often seen together with X"
    if "Often seen together with " in out:
        rest = out.split("Often seen together with ", 1)[1]
        out = _why_together(rest, lang)
    if out == "Matches your selected symptoms":
        out = _why_match(lang)
    if out == "Based on the symptoms you selected":
        out = _why_based(lang)
    # translate embedded condition names opportunistically
    for en_name in sorted(CONDITION.keys(), key=len, reverse=True):
        if en_name in out and en_name != out:
            # only replace whole-word-ish occurrences already handled; skip full equality
            loc = tr_condition(en_name, lang)
            if loc != en_name:
                out = out.replace(en_name, loc)
    return out


def localize_symptom_result(result: dict[str, Any], language: str = "en") -> dict[str, Any]:
    """Return a shallow-copied result with user-facing strings localized."""
    lang = (language or "en").lower()
    if lang not in ("hi", "hinglish"):
        # still ensure disclaimer exists
        r = dict(result)
        r.setdefault("disclaimer", _disclaimer("en", offline=True))
        return r

    r = dict(result)
    r["condition"] = tr_condition(str(r.get("condition") or ""), lang)

    causes = []
    for c in r.get("possible_causes") or []:
        cc = dict(c)
        raw_name = str(cc.get("condition") or "")
        why = str(cc.get("why") or "")
        # rewrite stock whys
        if why.startswith("Often seen together with "):
            top = why.replace("Often seen together with ", "", 1)
            why = _why_together(top, lang)
        elif why == "Matches your selected symptoms":
            why = _why_match(lang)
        elif why == "Based on the symptoms you selected":
            why = _why_based(lang)
        else:
            why = tr_text(why, lang)
        cc["condition"] = tr_condition(raw_name, lang)
        cc["why"] = why
        causes.append(cc)
    r["possible_causes"] = causes

    r["recommendations"] = [tr_text(str(x), lang) for x in (r.get("recommendations") or [])]
    r["treatment"] = [tr_text(str(x), lang) for x in (r.get("treatment") or [])]
    r["disclaimer"] = _disclaimer(lang, offline=True)
    return r
