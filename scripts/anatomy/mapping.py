"""
Correspondencia entre las mallas de Z-Anatomy (nombres de la Terminologia Anatomica, sin el
sufijo de lado «.l»/«.r») y los grupos musculares de Forja (`src/domain/muscles.ts`).

- Los músculos de MUSCLES se colorean según el ejercicio o el volumen semanal.
- OTHER_MUSCLES se incluyen en gris para que el cuerpo se vea completo, pero no se resaltan.
- Todo lo demás (fascias, bolsas sinoviales, vainas, músculos profundos o faciales diminutos)
  se descarta para reducir peso.
"""

MUSCLES = {
    "chest": [
        "Clavicular head of pectoralis major muscle",
        "Sternocostal head of pectoralis major muscle",
        "(Abdominal part of pectoralis major muscle)",
        "Pectoralis minor muscle",
    ],
    "frontDelts": ["Clavicular part of deltoid muscle"],
    "sideDelts": ["Acromial part of deltoid muscle"],
    "rearDelts": ["Scapular spinal part of deltoid muscle"],
    "biceps": [
        "Long head of biceps brachii",
        "Short head of biceps brachii",
        "Brachialis muscle",
    ],
    "triceps": [
        "Long head of triceps brachii",
        "Lateral head of triceps brachii",
        "Medial head of triceps brachii",
        "Anconeus muscle",
    ],
    "forearms": [
        "Brachioradialis muscle",
        "Flexor carpi radialis",
        "Palmaris longus muscle",
        "Humeral head of flexor carpi ulnaris",
        "Ulnar head of flexor carpi ulnaris",
        "Humero-ulnar head of flexor digitorum superficialis",
        "Radial head of flexor digitorum superficialis",
        "Flexor digitorum profundus",
        "Flexor pollicis longus",
        "Superficial head of pronator teres",
        "Deep head of pronator teres",
        "Pronator quadratus",
        "Extensor carpi radialis longus",
        "Extensor carpi radialis brevis",
        "Extensor digitorum",
        "Extensor digiti minimi",
        "Humeral head of extensor carpi ulnaris",
        "Ulnar head of extensor carpi ulnaris",
        "Supinator",
        "Abductor pollicis longus",
        "Extensor pollicis brevis",
        "Extensor pollicis longus",
        "Extensor indicis",
    ],
    "abs": ["Rectus abdominis muscle", "Pyramidalis muscle"],
    "obliques": ["External abdominal oblique muscle", "Internal abdominal oblique muscle"],
    "quads": [
        "Rectus femoris muscle",
        "Vastus lateralis muscle",
        "Vastus medialis muscle",
        "Vastus intermedius muscle",
    ],
    "hamstrings": [
        "Long head of biceps femoris",
        "Short head of biceps femoris",
        "Semitendinosus muscle",
        "Semimembranosus muscle",
    ],
    "glutes": ["Gluteus maximus muscle"],
    "abductors": ["Gluteus medius muscle", "Gluteus minimus muscle", "Tensor fasciae latae"],
    "adductors": [
        "Adductor longus",
        "Adductor brevis",
        "Adductor magnus",
        "(Adductor minimus)",
        "Gracilis muscle",
        "Pectineus muscle",
    ],
    "calves": [
        "Medial head of gastrocnemius",
        "Lateral head of gastrocnemius",
        "Soleus muscle",
        "Plantaris muscle",
    ],
    "lats": ["Latissimus dorsi muscle", "Teres major muscle"],
    "upperBack": [
        "Transverse part of trapezius muscle",
        "Ascending part of trapezius muscle",
        "Rhomboid major muscle",
        "Rhomboid minor muscle",
        "Infraspinatus muscle",
        "Teres minor muscle",
    ],
    "traps": ["Descending part of trapezius muscle"],
    "lowerBack": [
        "Iliocostalis lumborum muscle",
        "Iliocostalis thoracis muscle",
        "Longissimus thoracis muscle",
        "Spinalis thoracis muscle",
        "Multifidus lumborum muscle",
        "Quadratus lumborum muscle",
    ],
    "neck": [
        "Sternocleidomastoid muscle",
        "Splenius capitis muscle",
        "Splenius colli muscle",
        "Levator scapulae",
        "Scalenus anterior muscle",
        "Scalenus medius muscle",
        "Scalenus posterior muscle",
    ],
}

OTHER_MUSCLES = [
    "Serratus anterior muscle",
    "Supraspinatus muscle",
    "Subscapularis muscle",
    "Coracobrachialis muscle",
    "Sartorius muscle",
    "Iliacus muscle",
    "Psoas major",
    "Tibialis anterior muscle",
    "Tibialis posterior muscle",
    "Fibularis longus muscle",
    "Fibularis brevis muscle",
    "Fibularis tertius muscle",
    "Extensor digitorum longus",
    "Extensor hallucis longus",
    "Flexor digitorum longus",
    "Flexor hallucis longus",
    "Popliteus muscle",
    "Piriformis muscle",
    "Temporalis muscle",
    "Superficial part of masseter",
    "Frontalis muscle",
    "Occipitalis muscle",
    "Transversus abdominis muscle",
    "Linea alba",
    "Abductor pollicis brevis",
    "Opponens pollicis muscle",
    "Abductor digiti minimi of hand",
    "Dorsal interossei muscles of hand",
    "Abductor hallucis",
    "Abductor digiti minimi of foot",
    "Extensor digitorum brevis",
    "Flexor digitorum brevis",
]

# Huesos: se incluye todo el esqueleto salvo estas familias (pequeñas o invisibles con músculos).
BONE_EXCLUDED_PARENTS = {
    "Posterior teeth.g",
    "Anterior teeth.g",
    "Auditory ossicles.g",
    "Laryngeal cartilages.g",
    "Nasal cartilages.g",
}
BONE_EXCLUDED_NAMES = {"Hyoid bone", "Ethmoid bone"}

# Anclas de las zonas de lesión (`INJURY_ZONES`): hueso de referencia y qué parte tomar.
# «top»/«bottom»: centroide del 8 % de vértices más alto/bajo; «center»: centroide.
ANCHORS = {
    "neck": ("Vertebra C4", "center"),
    "shoulder": ("Humerus", "top"),
    "elbow": ("Humerus", "bottom"),
    "wrist": ("Radius", "bottom"),
    "lowerBack": ("Vertebra L3", "center"),
    "hip": ("Femur", "top"),
    "knee": ("Patella", "center"),
    "ankle": ("Talus", "center"),
}
