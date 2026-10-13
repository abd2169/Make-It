// FOOD: per 100g -> [kcal, protein, label, flags]  flags: m=meat f=fish e=egg d=dairy g=gluten
// Checked against USDA FoodData Central: chicken, tofu, oats, cheddar. Others are standard values (see notes).
const FOOD = {
  chicken:[120,22.5,"Chicken breast (raw)","m"], turkey:[150,18.7,"Turkey mince (7% fat)","m"],
  beef:[137,21.4,"Lean beef mince (5% fat)","m"], salmon:[208,20.4,"Salmon (raw)","f"],
  whitefish:[82,17.8,"White fish, e.g. cod (raw)","f"], tuna:[116,25.5,"Canned tuna in water","f"],
  shrimp:[85,20.1,"Shrimp (raw)","f"], egg:[143,12.6,"Eggs","e"],
  tofu:[144,17.3,"Firm tofu",""], chickpeas:[120,7,"Chickpeas (canned)",""],
  beans:[90,6,"Canned beans (black/cannellini)",""], lentils:[350,25,"Lentils (dry)",""],
  cottage:[98,11,"Cottage cheese","d"], yogurt:[60,10,"Greek yogurt (0% fat)","d"],
  cheese:[403,22.9,"Cheddar cheese","d"], parmesan:[431,38,"Parmesan","d"],
  cremefr:[340,2.5,"Creme fraiche","d"], milk:[50,3.4,"Milk (2%)","d"],
  rice:[360,7,"Rice (dry)",""], pasta:[360,13,"Pasta / orzo (dry)","g"],
  quinoa:[368,14.1,"Quinoa (dry)",""], couscous:[376,12.8,"Couscous (dry)","g"],
  oats:[379,13.2,"Oats","g"], bread:[250,9,"Bread","g"], tortilla:[300,8,"Tortillas","g"],
  potato:[77,2,"Potatoes",""], sweetpotato:[86,1.6,"Sweet potato",""],
  onion:[40,1.1,"Onion",""], tomato:[18,0.9,"Tomatoes",""],
  passata:[30,1.5,"Passata / tomato sauce",""], pepper:[30,1,"Bell pepper",""],
  broccoli:[34,2.8,"Broccoli",""], spinach:[23,2.9,"Spinach",""], mushroom:[22,3.1,"Mushrooms",""],
  carrot:[41,0.9,"Carrots",""], cucumber:[15,0.7,"Cucumber",""], avocado:[160,2,"Avocado",""],
  banana:[89,1.1,"Banana",""], pbutter:[588,25,"Peanut butter",""],
  coconut:[197,2,"Coconut milk (full fat, canned)",""], pesto:[420,5,"Pesto","d"],
  oil:[884,0,"Oil",""], soy:[53,8,"Soy sauce","g"]
};
const STAPLES = ["oil","soy"];
// m: b=breakfast l=lunch d=dinner | t: total minutes | e: effort 1 easy, 2 medium
// i: "food:grams" per serving | s: "step|minutes;..." | src/u/ref: optional source name, link, author's stated figures
const SRC_HHH="Hungry Healthy Happy";
const R = [
{n:"Chicken Rice Bowl",m:"ld",t:20,e:1,i:"chicken:180,rice:75,onion:60,pepper:80,yogurt:60,oil:8",s:"Start rice, cover and simmer|15;Dice chicken, onion, pepper; season|4;Fry chicken and veg until cooked|8;Mix yogurt with salt, pepper, lemon for sauce|2;Bowl rice, top with chicken and sauce|1"},
{n:"Chicken Egg Fried Rice",m:"ld",t:25,e:1,i:"chicken:120,rice:70,egg:100,onion:50,carrot:60,soy:15,oil:8",s:"Cook rice and let it steam-dry|15;Dice and fry chicken|7;Add onion, carrot; scramble eggs in the pan|5;Stir in rice and soy sauce|3"},
{n:"Tuna Tomato Pasta",m:"ld",t:20,e:1,i:"pasta:80,tuna:120,passata:150,onion:40,cheese:15,oil:5",s:"Boil pasta|10;Soften onion in oil|4;Add passata and tuna, simmer|6;Toss with pasta, top with cheese|1"},
{n:"Beef & Veg Stir-fry with Rice",m:"ld",t:25,e:2,i:"beef:150,rice:70,pepper:80,broccoli:100,soy:15,oil:8",s:"Start rice|15;Slice veg|4;Brown beef on high heat|5;Add veg, cook 4 min, add soy|5;Serve over rice|1"},
{n:"Salmon, Potatoes & Broccoli",m:"d",t:35,e:1,i:"salmon:160,potato:250,broccoli:150,oil:8",s:"Cube potatoes, toss in oil, roast at 200°C|25;Add salmon to tray|12;Steam broccoli|6;Season and plate|1"},
{n:"Veggie Cheese Omelette & Toast",m:"bld",t:12,e:1,i:"egg:200,mushroom:80,spinach:50,cheese:30,tomato:80,bread:60",s:"Slice mushrooms and tomato, fry|4;Add spinach until wilted|1;Pour in beaten eggs, add cheese|4;Fold, serve with toast|2"},
{n:"Chickpea Spinach Curry",m:"ld",t:25,e:2,i:"chickpeas:240,spinach:80,onion:80,passata:200,rice:70,oil:8",s:"Start rice|15;Fry onion with curry powder|5;Add passata and chickpeas, simmer|10;Stir in spinach, serve over rice|2"},
{n:"Lentil Veg Soup & Bread",m:"ld",t:30,e:1,i:"lentils:80,carrot:80,onion:80,passata:100,oil:8,bread:60",s:"Chop onion and carrot, soften in oil|6;Add lentils, passata, 500ml water|2;Simmer until lentils are tender|20;Season, serve with bread|1"},
{n:"Tofu Veg Stir-fry",m:"ld",t:25,e:2,i:"tofu:200,rice:70,broccoli:120,pepper:80,soy:15,oil:8",s:"Start rice|15;Press and cube tofu|3;Fry tofu until golden|8;Add veg and soy, cook|5;Serve over rice|1"},
{n:"Chicken Burrito Bowl",m:"ld",t:25,e:2,i:"chicken:170,rice:60,beans:120,tomato:100,cheese:25,onion:40",s:"Start rice|15;Dice and fry seasoned chicken|8;Warm beans, chop tomato and onion|4;Assemble bowl, top with cheese|2"},
{n:"Chicken Yogurt Wrap",m:"ld",t:15,e:1,i:"tortilla:120,chicken:150,yogurt:50,tomato:80,spinach:40,cheese:20",s:"Slice and fry seasoned chicken|8;Mix yogurt with salt and garlic|1;Fill wraps with chicken, veg, cheese, sauce|3;Roll and toast in pan|3"},
{n:"Garlic Shrimp Pasta",m:"ld",t:20,e:2,i:"shrimp:200,pasta:80,tomato:100,spinach:60,oil:10",s:"Boil pasta|10;Fry garlic in oil, add shrimp|4;Add tomato and spinach|3;Toss with pasta|1"},
{n:"Chicken Avocado Salad",m:"ld",t:15,e:1,i:"chicken:160,avocado:80,cucumber:100,tomato:100,bread:40,yogurt:50,oil:5",s:"Pan-fry chicken|9;Chop veg and avocado|4;Mix yogurt, lemon, salt as dressing|1;Combine; serve with bread|1"},
{n:"Shakshuka",m:"bld",t:20,e:2,i:"egg:150,passata:250,pepper:80,onion:60,chickpeas:100,bread:60",s:"Soften onion and pepper|6;Add passata, chickpeas, paprika; simmer|6;Make wells, crack in eggs, cover|7;Serve with bread|1"},
{n:"Beef & Bean Chili",m:"d",t:30,e:2,i:"beef:150,beans:200,passata:200,onion:60,pepper:80,rice:50",s:"Start rice|15;Brown beef with onion|7;Add pepper, beans, passata, chili|3;Simmer|12;Serve over rice|1"},
{n:"Protein Oats",m:"b",t:7,e:1,i:"oats:70,milk:250,banana:100,pbutter:15,yogurt:100",s:"Simmer oats in milk|5;Slice banana|1;Top with yogurt, peanut butter|1"},
{n:"Scrambled Eggs on Toast",m:"b",t:10,e:1,i:"egg:150,bread:80,cheese:20,tomato:100,oil:5",s:"Toast bread, slice tomato|3;Scramble eggs low and slow|4;Stir in cheese; serve|2"},
{n:"Cottage Cheese Banana Bowl",m:"b",t:5,e:1,i:"cottage:200,banana:100,oats:40,pbutter:10",s:"Spoon cottage cheese into bowl|1;Top with banana, oats|2;Drizzle peanut butter|1"},
{n:"Tuna Salad Sandwich",m:"l",t:8,e:1,i:"bread:100,tuna:120,yogurt:40,cucumber:80,tomato:60,cheese:20",s:"Mix tuna, yogurt, salt, pepper|2;Slice veg|3;Assemble sandwich|2"},
{n:"Tofu Scramble on Toast",m:"b",t:12,e:1,i:"tofu:150,bread:80,spinach:50,tomato:80,oil:5",s:"Crumble tofu into hot oil, add turmeric|5;Add spinach and tomato|3;Toast bread, serve|3"},
{n:"Chicken Broccoli Pasta",m:"ld",t:20,e:1,i:"chicken:170,pasta:80,broccoli:100,cheese:20,oil:8",s:"Boil pasta; add broccoli last 3 min|10;Dice and fry chicken|8;Toss all with cheese|2"},
/* ---- Recipes with real source quantities ---- */
{n:"High-Protein Marry Me Chicken Pasta",m:"ld",t:20,e:1,i:"chicken:115,pasta:50,cottage:75,spinach:25,parmesan:10,passata:20,oil:5",s:"Boil pasta until tender|10;Brown diced chicken with Italian seasoning|8;Blend cooled stock, cottage cheese, garlic and tomato puree until smooth|2;Toss pasta, chicken and spinach with the sauce and Parmesan|1;Warm gently on low heat so the sauce does not split|2",src:"Adapted from "+SRC_HHH,u:"https://hungryhealthyhappy.com/high-protein-marry-me-chicken/",ref:"Author states 486 kcal, 45g protein per serving"},
{n:"Creamy Chicken Orzo",m:"ld",t:25,e:1,i:"chicken:140,pasta:70,spinach:50,tomato:50,pesto:15,parmesan:10,cremefr:25,oil:5",s:"Coat chicken strips in paprika and Italian seasoning, sear, set aside|6;Simmer orzo with garlic and stock in the same pan|7;Stir in spinach, tomatoes, Parmesan and pesto|2;Add creme fraiche, return chicken, heat through|4",src:"Adapted from "+SRC_HHH,u:"https://hungryhealthyhappy.com/creamy-chicken-orzo/",ref:"Author states 721 kcal, 52g protein per serving"},
/* ---- Ideas from the Hungry Healthy Happy roundup; quantities are my own ---- */
{n:"Sticky Salmon Stir-Fry",m:"ld",t:20,e:2,i:"salmon:150,rice:70,broccoli:80,pepper:60,carrot:40,soy:15,oil:5",s:"Start rice|15;Cube salmon, slice veg|3;Sear salmon pieces, add veg, stir-fry|4;Add soy-based teriyaki glaze, coat 1 minute, serve over rice|2",src:"Inspired by "+SRC_HHH,u:"https://hungryhealthyhappy.com/sticky-salmon-stir-fry/",ref:"Author states 35g protein for her version"},
{n:"Chicken Pesto Pasta",m:"ld",t:20,e:1,i:"pasta:80,chicken:150,pesto:20,broccoli:80,spinach:40,yogurt:40,parmesan:10",s:"Boil pasta, add broccoli for last 3 minutes|10;Fry diced chicken until golden|8;Stir pesto and yogurt through the drained pasta, add spinach and chicken|2",src:"Inspired by "+SRC_HHH,u:"https://hungryhealthyhappy.com/chicken-pesto-pasta/",ref:"Author states 39g protein for her version"},
{n:"Chicken Carbonara (Yogurt Sauce)",m:"ld",t:20,e:1,i:"pasta:80,chicken:130,yogurt:80,egg:50,parmesan:15,mushroom:60",s:"Boil pasta|10;Fry chicken and mushrooms|7;Whisk yogurt, egg and Parmesan|1;Off the heat, toss with pasta so the sauce turns creamy, not scrambled|2",src:"Inspired by "+SRC_HHH+" healthier carbonara",u:"https://hungryhealthyhappy.com/healthier-carbonara/",ref:"Author states 30g protein for her version"},
{n:"Cheesy White Bean Bake",m:"ld",t:20,e:1,i:"beans:250,passata:200,spinach:60,cheese:40,onion:50,bread:50",s:"Soften onion|4;Add passata, herbs and beans, simmer|6;Stir in spinach, top with cheese|2;Grill or bake until bubbling, serve with bread|8",src:"Inspired by "+SRC_HHH,u:"https://hungryhealthyhappy.com/cheesy-white-bean-bake/",ref:"Author states 15g protein for her version"},
{n:"Turkey Bolognese",m:"ld",t:25,e:2,i:"turkey:150,pasta:75,passata:200,onion:60,carrot:50,mushroom:50",s:"Boil pasta|10;Brown turkey with onion, carrot, mushroom|8;Add passata and herbs, simmer|10;Serve over pasta|1",src:"Inspired by "+SRC_HHH,u:"https://hungryhealthyhappy.com/easy-turkey-bolognese/",ref:"Author states 26g protein for her version"},
{n:"Turkey Smash Burger",m:"ld",t:15,e:1,i:"turkey:150,bread:70,cheese:20,tomato:60,onion:20,spinach:20",s:"Form turkey into balls, smash flat in a hot pan|3;Cook 2-3 minutes a side, add cheese to melt|5;Toast bun, add tomato, onion, spinach, burger|3",src:"Inspired by "+SRC_HHH,u:"https://hungryhealthyhappy.com/turkey-smash-burgers/",ref:"Author states 37g protein for her version"},
{n:"Chicken Fajita Wraps",m:"ld",t:20,e:1,i:"tortilla:120,chicken:150,pepper:100,onion:60,yogurt:40,cheese:20,oil:5",s:"Slice chicken, pepper and onion; toss in fajita spices|5;Cook in a hot pan (or air fryer) until chicken is cooked|12;Fill wraps, top with yogurt and cheese|3",src:"Inspired by "+SRC_HHH+" air fryer fajitas",u:"https://hungryhealthyhappy.com/air-fryer-chicken-fajitas/",ref:"Author states 22g protein for her version"},
{n:"Coconut Chicken Curry",m:"ld",t:25,e:2,i:"chicken:150,rice:70,onion:60,pepper:70,coconut:60,spinach:30",s:"Start rice|15;Fry onion with curry paste|4;Add chicken and pepper, cook through|6;Pour in coconut milk, simmer, wilt spinach|5;Serve over rice|1",src:"Inspired by "+SRC_HHH,u:"https://hungryhealthyhappy.com/quick-coconut-chicken-curry/",ref:"Author states 28g protein for her version"},
{n:"Cottage Cheese Tuna Salad",m:"l",t:8,e:1,i:"tuna:120,cottage:100,cucumber:80,tomato:80,bread:60",s:"Drain tuna, mix with cottage cheese, salt, pepper|2;Chop cucumber and tomato|3;Serve over salad with bread|2",src:"Inspired by "+SRC_HHH,u:"https://hungryhealthyhappy.com/cottage-cheese-tuna-salad/"},
/* ---- More classic builds (my own) ---- */
{n:"Tuna Rice Bowl",m:"ld",t:20,e:1,i:"tuna:130,rice:70,cucumber:80,avocado:40,soy:10",s:"Cook rice|15;Slice cucumber and avocado|3;Flake tuna with soy|1;Assemble bowl|1"},
{n:"Salmon Rice Bowl",m:"ld",t:20,e:1,i:"salmon:150,rice:70,cucumber:80,avocado:50,soy:10",s:"Cook rice|15;Pan-sear salmon skin-side down|8;Slice cucumber and avocado|2;Flake salmon over rice, add veg and soy|1"},
{n:"Baked White Fish, Potatoes & Broccoli",m:"d",t:35,e:1,i:"whitefish:180,potato:250,broccoli:120,oil:8",s:"Cube potatoes, toss in oil, roast at 200°C|25;Add fish to tray|12;Steam broccoli|6;Season, add lemon, plate|1"},
{n:"Lemon Garlic Shrimp Rice",m:"ld",t:25,e:1,i:"shrimp:200,rice:70,pepper:80,spinach:40,oil:8",s:"Start rice|15;Fry garlic and pepper in oil|4;Add shrimp until pink, add spinach|4;Serve over rice with lemon|1"},
{n:"Beef Burrito Bowl",m:"ld",t:25,e:2,i:"beef:140,rice:60,beans:100,pepper:80,tomato:80,cheese:20",s:"Start rice|15;Brown seasoned beef|7;Warm beans, chop pepper and tomato|4;Assemble, top with cheese|2"},
{n:"Greek Chicken Quinoa Bowl",m:"ld",t:25,e:1,i:"quinoa:60,chicken:160,cucumber:100,tomato:100,onion:30,yogurt:50,oil:5",s:"Simmer quinoa|15;Pan-fry seasoned chicken|9;Chop veg|3;Mix yogurt with lemon and salt, assemble bowl|2"},
{n:"Chicken Couscous Salad",m:"l",t:15,e:1,i:"couscous:70,chicken:140,cucumber:80,tomato:80,pepper:50,yogurt:40",s:"Soak couscous in boiling water, cover|5;Fry diced chicken|8;Chop veg, mix with yogurt dressing|3;Combine|1"},
{n:"Sweet Potato & Black Bean Bowl",m:"ld",t:30,e:1,i:"sweetpotato:250,beans:150,avocado:50,yogurt:50,spinach:30",s:"Cube sweet potato, roast at 200°C|25;Warm beans with spices|4;Assemble with spinach, avocado, yogurt|2"},
{n:"Egg & Veg Fried Rice",m:"ld",t:25,e:1,i:"egg:150,rice:70,carrot:50,pepper:50,onion:40,soy:15,oil:8",s:"Cook rice and let it steam-dry|15;Fry onion, carrot, pepper|5;Push aside, scramble eggs|3;Stir in rice and soy|2"},
{n:"Beef & Broccoli with Rice",m:"ld",t:25,e:2,i:"beef:150,broccoli:150,rice:70,soy:15,oil:5",s:"Start rice|15;Brown beef on high heat|5;Add broccoli and a splash of water, steam-fry|4;Add soy, serve over rice|1"},
{n:"Red Lentil Coconut Dal",m:"ld",t:30,e:1,i:"lentils:80,onion:70,passata:150,spinach:50,coconut:40,rice:50",s:"Start rice|15;Fry onion with curry spices|5;Add lentils, passata, 400ml water, simmer|18;Stir in coconut milk and spinach|2"},
{n:"Cottage Cheese Oat Pancakes",m:"b",t:15,e:1,i:"oats:60,egg:100,cottage:100,banana:80",s:"Blend oats, eggs, cottage cheese, banana|2;Cook small pancakes in a nonstick pan|10;Stack and serve|1"},
{n:"Greek Yogurt Oat Bowl",m:"b",t:5,e:1,i:"oats:50,yogurt:200,banana:80,pbutter:10,milk:80",s:"Stir oats, yogurt and milk together|2;Slice banana|1;Top with peanut butter|1"},
{n:"Breakfast Burrito",m:"bl",t:12,e:1,i:"tortilla:60,egg:150,beans:60,cheese:20,pepper:50",s:"Scramble eggs with diced pepper|5;Warm tortilla and beans|2;Fill, add cheese, roll|2"}
];