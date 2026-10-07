/* Hyper-Craft authoritative recipe database.
   Every recipe is reachable from Earth, Water, Fire, or Air.
   One recipe per ingredient pair and one primary recipe per item keeps the graph deterministic and prevents reverse/circular recipes. */
window.HYPERCRAFT_RECIPES={
  "air+water": [
    "☁️",
    "Cloud"
  ],
  "air+fire": [
    "⚡",
    "Energy"
  ],
  "earth+fire": [
    "🌋",
    "Lava"
  ],
  "cloud+fire": [
    "⚡",
    "Lightning"
  ],
  "earth+water": [
    "🌱",
    "Plant"
  ],
  "cloud+water": [
    "🌧️",
    "Rain"
  ],
  "air+air": [
    "🌤️",
    "Sky"
  ],
  "fire+water": [
    "💨",
    "Steam"
  ],
  "lava+water": [
    "🪨",
    "Stone"
  ],
  "air+cloud": [
    "⛈️",
    "Thunderstorm"
  ],
  "earth+plant": [
    "🌳",
    "Tree"
  ],
  "tree+water": [
    "🪵",
    "Wood"
  ],
  "plant+water": [
    "🌿",
    "Algae"
  ],
  "fire+plant": [
    "🔥",
    "Ash"
  ],
  "energy+stone": [
    "💎",
    "Crystal"
  ],
  "air+earth": [
    "🌫️",
    "Dust"
  ],
  "fire+steam": [
    "⚙️",
    "Engine"
  ],
  "stone+water": [
    "🪨",
    "Erosion"
  ],
  "air+lava": [
    "🌋",
    "Eruption"
  ],
  "earth+tree": [
    "🌳",
    "Forest"
  ],
  "plant+rain": [
    "🌺",
    "Garden"
  ],
  "steam+stone": [
    "🌋",
    "Geysir"
  ],
  "energy+fire": [
    "🔥",
    "Heat"
  ],
  "air+tree": [
    "🍃",
    "Leaf"
  ],
  "earth+energy": [
    "🧲",
    "Magnet"
  ],
  "earth+stone": [
    "⛰️",
    "Mountain"
  ],
  "dust+water": [
    "🟫",
    "Mud"
  ],
  "lava+stone": [
    "🖤",
    "Obsidian"
  ],
  "ash+tree": [
    "✏️",
    "Pencil"
  ],
  "air+plant": [
    "🌿",
    "Pollen"
  ],
  "crystal+energy": [
    "💎",
    "Quartz"
  ],
  "rain+water": [
    "🌊",
    "River"
  ],
  "mountain+water": [
    "💧",
    "Spring"
  ],
  "air+rain": [
    "🌧️",
    "Storm"
  ],
  "plant+steam": [
    "🍵",
    "Tea"
  ],
  "earth+engine": [
    "🚜",
    "Tractor"
  ],
  "earth+lava": [
    "🌋",
    "Volcano"
  ],
  "air+energy": [
    "⚡",
    "Wind"
  ],
  "engine+wind": [
    "🌬️",
    "Windmill"
  ],
  "energy+water": [
    "🔋",
    "Battery"
  ],
  "fire+wood": [
    "🔥",
    "Charcoal"
  ],
  "charcoal+earth": [
    "🪨",
    "Coal"
  ],
  "plant+stone": [
    "🧬",
    "Life"
  ],
  "fire+stone": [
    "🔩",
    "Metal"
  ],
  "water+wood": [
    "📄",
    "Paper"
  ],
  "earth+sky": [
    "🪐",
    "Planet"
  ],
  "air+stone": [
    "🏖️",
    "Sand"
  ],
  "fire+planet": [
    "☀️",
    "Sun"
  ],
  "air+metal": [
    "✈️",
    "Aircraft"
  ],
  "mountain+wind": [
    "🌨️",
    "Avalanche"
  ],
  "air+life": [
    "🐦",
    "Bird"
  ],
  "fire+mud": [
    "🧱",
    "Brick"
  ],
  "engine+plant": [
    "🚗",
    "Car"
  ],
  "plant+wind": [
    "🌼",
    "Dandelion"
  ],
  "bird+water": [
    "🦆",
    "Duck"
  ],
  "air+bird": [
    "🦅",
    "Eagle"
  ],
  "car+energy": [
    "🚗",
    "Electric Car"
  ],
  "plant+tractor": [
    "🐄",
    "Farm"
  ],
  "car+fire": [
    "🚒",
    "Fire Truck"
  ],
  "life+water": [
    "🐟",
    "Fish"
  ],
  "fire+metal": [
    "🔩",
    "Forge"
  ],
  "life+stone": [
    "🦴",
    "Fossil"
  ],
  "obsidian+water": [
    "🥃",
    "Glass"
  ],
  "brick+brick": [
    "🏠",
    "House"
  ],
  "life+plant": [
    "🧑",
    "Human"
  ],
  "air+human": [
    "🪁",
    "Kite"
  ],
  "magnet+stone": [
    "🧲",
    "Lodestone"
  ],
  "lava+metal": [
    "🔩",
    "Molten Metal"
  ],
  "dandelion+mountain": [
    "💧",
    "Mountain Dew"
  ],
  "bird+earth": [
    "🐦",
    "Nest"
  ],
  "earth+metal": [
    "⛏️",
    "Ore"
  ],
  "bird+human": [
    "🦜",
    "Parrot"
  ],
  "house+water": [
    "🚿",
    "Plumbing"
  ],
  "air+car": [
    "🏎️",
    "Race Car"
  ],
  "metal+water": [
    "🦀",
    "Rust"
  ],
  "fire+wind": [
    "💨",
    "Smoke"
  ],
  "metal+stone": [
    "🔧",
    "Tool"
  ],
  "air+wind": [
    "🌪️",
    "Tornado"
  ],
  "house+tree": [
    "🏠",
    "Treehouse"
  ],
  "water+wind": [
    "🌊",
    "Wave"
  ],
  "fish+water": [
    "🐋",
    "Whale"
  ],
  "dandelion+water": [
    "🍷",
    "Wine"
  ],
  "human+tree": [
    "🧑",
    "Woodworker"
  ],
  "fire+life": [
    "🐾",
    "Animal"
  ],
  "metal+wood": [
    "🪓",
    "Axe"
  ],
  "human+metal": [
    "⚒️",
    "Blacksmith"
  ],
  "paper+wood": [
    "📖",
    "Book"
  ],
  "human+stone": [
    "🏗️",
    "Builder"
  ],
  "human+wood": [
    "🪚",
    "Carpenter"
  ],
  "fire+human": [
    "🍳",
    "Cooking"
  ],
  "lightning+metal": [
    "⚡",
    "Electricity"
  ],
  "human+plant": [
    "🌾",
    "Farmer"
  ],
  "animal+plant": [
    "🍽️",
    "Food"
  ],
  "sun+tree": [
    "🍎",
    "Fruit"
  ],
  "book+human": [
    "📚",
    "Knowledge"
  ],
  "energy+metal": [
    "⚙️",
    "Machine"
  ],
  "food+human": [
    "🍽️",
    "Meal"
  ],
  "animal+fire": [
    "🥩",
    "Meat"
  ],
  "air+sun": [
    "🌌",
    "Night Sky"
  ],
  "animal+human": [
    "🐾",
    "Pet"
  ],
  "rain+sun": [
    "🌈",
    "Rainbow"
  ],
  "human+machine": [
    "🤖",
    "Robot"
  ],
  "electricity+glass": [
    "🖥️",
    "Screen"
  ],
  "air+electricity": [
    "📡",
    "Signal"
  ],
  "car+sun": [
    "🚗",
    "Solar Car"
  ],
  "air+signal": [
    "🔊",
    "Sound"
  ],
  "farmer+plant": [
    "🌾",
    "Wheat"
  ],
  "wind+wine": [
    "🎈",
    "Balloon"
  ],
  "farm+fire": [
    "🍖",
    "Barbecue"
  ],
  "human+water": [
    "🚿",
    "Bath"
  ],
  "house+wood": [
    "🏠",
    "Cabin"
  ],
  "air+fish": [
    "🐬",
    "Dolphin"
  ],
  "book+knowledge": [
    "📚",
    "Education"
  ],
  "electricity+magnet": [
    "🧲",
    "Electromagnet"
  ],
  "fire+house": [
    "🔥",
    "Fireplace"
  ],
  "fish+human": [
    "🎣",
    "Fishing"
  ],
  "smoke+water": [
    "🌫️",
    "Fog"
  ],
  "machine+metal": [
    "🖥️",
    "Hardware"
  ],
  "house+human": [
    "🏠",
    "Home"
  ],
  "electricity+engine": [
    "⚙️",
    "Motor"
  ],
  "fire+machine": [
    "🚀",
    "Rocket"
  ],
  "air+smoke": [
    "🌫️",
    "Smog"
  ],
  "energy+rocket": [
    "🚀",
    "Spaceship"
  ],
  "human+robot": [
    "🤖",
    "Android"
  ],
  "fruit+tree": [
    "🍎",
    "Apple"
  ],
  "human+signal": [
    "📡",
    "Communication"
  ],
  "electricity+machine": [
    "💻",
    "Computer"
  ],
  "fire+meat": [
    "🍖",
    "Cooked Meat"
  ],
  "stone+wheat": [
    "🌾",
    "Flour"
  ],
  "human+knowledge": [
    "💡",
    "Idea"
  ],
  "communication+computer": [
    "🌐",
    "Internet"
  ],
  "computer+paper": [
    "⌨️",
    "Keyboard"
  ],
  "computer+screen": [
    "🖥️",
    "Monitor"
  ],
  "night sky+stone": [
    "🌙",
    "Moon"
  ],
  "idea+sound": [
    "🎵",
    "Music"
  ],
  "human+music": [
    "🎵",
    "Musician"
  ],
  "battery+computer": [
    "📱",
    "Phone"
  ],
  "computer+human": [
    "👨‍💻",
    "Programmer"
  ],
  "electricity+signal": [
    "📻",
    "Radio"
  ],
  "musician+sound": [
    "🎤",
    "Singer"
  ],
  "internet+phone": [
    "📱",
    "Smartphone"
  ],
  "computer+internet": [
    "🌐",
    "Web"
  ],
  "internet+web": [
    "🌐",
    "Website"
  ],
  "energy+idea": [
    "💡",
    "Innovation"
  ],
  "idea+machine": [
    "⚙️",
    "Invention"
  ],
  "human+idea": [
    "🎨",
    "Art"
  ],
  "computer+knowledge": [
    "🧠",
    "Artificial Intelligence"
  ],
  "art+human": [
    "🎨",
    "Artist"
  ],
  "computer+music": [
    "🎵",
    "Audio"
  ],
  "computer+programmer": [
    "💻",
    "Code"
  ],
  "flour+water": [
    "🥣",
    "Dough"
  ],
  "electricity+music": [
    "🎧",
    "Headphones"
  ],
  "code+code": [
    "💻",
    "Program"
  ],
  "computer+program": [
    "💾",
    "Software"
  ],
  "art+fire": [
    "🏺",
    "Ceramics"
  ],
  "art+music": [
    "🎭",
    "Performance"
  ],
  "art+stone": [
    "🗿",
    "Sculpture"
  ],
  "phone+software": [
    "📱",
    "App"
  ],
  "dough+fire": [
    "🍞",
    "Bread"
  ],
  "code+program": [
    "🎮",
    "Game"
  ],
  "game+internet": [
    "🌐",
    "Online Game"
  ],
  "computer+game": [
    "🎮",
    "Video Game"
  ],
  "game+human": [
    "🎉",
    "Fun"
  ]
};
