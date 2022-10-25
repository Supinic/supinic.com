const data = {
	"constants": {
		"percentagePerRaidLevel": 0.4,
		"damagePercentageCap": 150
	},
	"base": {
		"level": 0,
		"attempts": -1,
		"timeLimit": -1,
		"suppliesPercentage": 100,
		"pathLevelUpOnCompletion": false,
		"pathLevelUpOnEntry": 0,
		"prayerEffectivenessDelta": 0,
		"foodDisabled": false,
		"healingPotionsDisabled": false,
		"specialAttackEnergyOverride": false
	},
	"modes": [
		{
			"name": "entry",
			"min": 0,
			"max": 149,
			"icon": "https://oldschool.runescape.wiki/images/Tombs_of_Amascut_-_Entry_Mode_icon.png"
		},
		{
			"name": "normal",
			"min": 150,
			"max": 299,
			"icon": "https://oldschool.runescape.wiki/images/Tombs_of_Amascut_-_Normal_Mode_icon.png"
		},
		{
			"name": "expert",
			"min": 300,
			"max": 600,
			"icon": "https://oldschool.runescape.wiki/images/Tombs_of_Amascut_-_Expert_Mode_icon.png"
		}
	],
	"attributes": [
		{
		  "name": "damage",
		  "capped": true
		},
		{
		  "name": "hitpoints",
		  "capped": false
		},
		{
		  "name": "defence",
		  "capped": false
		},
		{
		  "name": "accuracy",
		  "capped": false
		}
	],
	"invocationCategories": [
		{
			"title": "Attempts",
			"unique": true,
			"boss": false,
			"icon": "https://oldschool.runescape.wiki/images/Invocations_-_attempts_icon.png",
			"list": [
				{
					"id": 1,
					"name": "Try Again",
					"description": "Limits the overall number of attempts that can be made within the raid to 10. An attempt is failed if every member of the party dies during a challenge.",
					"level": 5,
					"summary": "10 attempts",
					"data": {
						"attempts": 10
					}
				},
				{
					"id": 2,
					"name": "Persistence",
					"description": "Limits the overall number of attempts that can be made within the raid to 5. An attempt is failed if every member of the party dies during a challenge.",
					"level": 10,
					"summary": "5 attempts",
					"data": {
						"attempts": 5
					}
				},
				{
					"id": 3,
					"name": "Softcore Run",
					"description": "Limits the overall number of attempts that can be made within the raid to 3. An attempt is failed if every member of the party dies during a challenge.",
					"level": 15,
					"summary": "3 attempts",
					"data": {
						"attempts": 3
					}
				},
				{
					"id": 4,
					"name": "Hardcore Run",
					"description": "Limits the overall number of attempts that can be made within the raid to 1. An attempt is failed if every member of the party dies during a challenge.",
					"level": 25,
					"summary": "1 attempt",
					"data": {
						"attempts": 1
					}
				}
			]
		},
		{
			"title": "Time Limit",
			"unique": true,
			"boss": false,
			"icon": "https://oldschool.runescape.wiki/images/Invocations_-_time_limit_icon.png",
			"list": [
				{
					"id": 5,
					"name": "Walk for It",
					"description": "Sets a 40 minute time limit on the raid. If the time is achieved, the raid level is increased. Otherwise, the raid level is decreased.",
					"level": 10,
					"summary": "40min time limit",
					"data": {
						"timeLimit": 40
					}
				},
				{
					"id": 6,
					"name": "Jog for It",
					"description": "Sets a 35 minute time limit on the raid. If the time is achieved, the raid level is increased. Otherwise, the raid level is decreased.",
					"level": 15,
					"summary": "35min time limit",
					"data": {
						"timeLimit": 35
					}
				},
				{
					"id": 7,
					"name": "Run for It",
					"description": "Sets a 30 minute time limit on the raid. If the time is achieved, the raid level is increased. Otherwise, the raid level is decreased.",
					"level": 20,
					"summary": "30min time limit",
					"data": {
						"timeLimit": 30
					}
				},
				{
					"id": 8,
					"name": "Sprint for It",
					"description": "Sets a 25 minute time limit on the raid. If the time is achieved, the raid level is increased. Otherwise, the raid level is decreased.",
					"level": 25,
					"summary": "25min time limit",
					"data": {
						"timeLimit": 25
					}
				}
			]
		},
		{
			"title": "Helpful Spirit",
			"unique": true,
			"boss": false,
			"icon": "https://oldschool.runescape.wiki/images/Invocations_-_helpful_spirit_icon.png",
			"list": [
				{
					"id": 9,
					"name": "Need Some Help?",
					"description": "The quantity of items offered by the Helpful Spirit will be reduced to 66%.",
					"level": 15,
					"summary": "2/3 supplies",
					"data": {
						"suppliesPercentage": 66
					}
				},
				{
					"id": 10,
					"name": "Need Less Help?",
					"description": "The quantity of items offered by the Helpful Spirit will be reduced to 33%.",
					"level": 25,
					"summary": "1/3 supplies",
					"data": {
						"suppliesPercentage": 33
					}
				},
				{
					"id": 11,
					"name": "No Help Needed",
					"description": "The quantity of items offered by the Helpful Spirit will be reduced to 10%.",
					"level": 40,
					"summary": "1/10 supplies",
					"data": {
						"suppliesPercentage": 10
					}
				}
			]
		},
		{
			"title": "Paths",
			"unique": false,
			"boss": false,
			"icon": "https://oldschool.runescape.wiki/images/Invocations_-_Walk_the_Path_icon.png",
			"list": [
				{
					"id": 12,
					"name": "Walk the Path",
					"description": "Completing a path during the raid will cause other paths to level up.",
					"level": 50,
					"summary": "other paths level up when one is completed",
					"data": {
						"pathLevelUpOnCompletion": true
					}
				}
			]
		},
		{
			"title": "Path Level",
			"unique": true,
			"boss": false,
			"icon": "https://oldschool.runescape.wiki/images/Invocations_-_path_level_up_icon.png",
			"list": [
				{
					"id": 13,
					"name": "Pathseeker",
					"description": "All paths will level up once upon entering the raid.",
					"level": 15,
					"summary": "+1 all path level",
					"data": {
						"pathLevelUpOnEntry": 1
					}
				},
				{
					"id": 14,
					"name": "Pathfinder",
					"description": "All paths will level up twice upon entering the raid.",
					"level": 40,
					"summary": "+2 all path level",
					"data": {
						"pathLevelUpOnEntry": 2
					}
				},
				{
					"id": 15,
					"name": "Pathmaster",
					"description": "All paths will level up three times upon entering the raid.",
					"level": 50,
					"summary": "+3 all path level",
					"data": {
						"pathLevelUpOnEntry": 3
					}
				}
			]
		},
		{
			"title": "Prayer",
			"unique": false,
			"boss": false,
			"icon": "https://oldschool.runescape.wiki/images/Invocations_-_prayer_effectiveness_icon.png",
			"list": [
				{
					"id": 16,
					"name": "Quiet Prayers",
					"description": "Protection prayers will be 10% less effective within the raid.",
					"level": 20,
					"summary": "-10% protection prayers effect",
					"data": {
						"prayerEffectivenessDelta": -10
					}
				},
				{
					"id": 17,
					"name": "Deadly Prayers",
					"description": "Prayer is drained by 20% of damage taken.",
					"level": 35,
					"summary": "prayer is drained by 20% of damage taken (not prevented)",
					"data": {
						"prayerEffectivenessDelta": -25
					}
				}
			]
		},
		{
			"title": "Restoration",
			"unique": false,
			"boss": false,
			"icon": null,
			"list": [
				{
					"id": 18,
					"name": "On a Diet",
					"description": "Food will no longer heal you within the raid.",
					"level": 15,
					"icon": "https://oldschool.runescape.wiki/images/Invocations_-_On_a_Diet_icon.png",
					"summary": "no food (raid: silk dressing, honey locust)",
					"data": {
						"foodDisabled": true
					}
				},
				{
					"id": 19,
					"name": "Dehydration",
					"description": "Potions which restore health will no longer have an effect within the raid.",
					"level": 30,
					"icon": "https://oldschool.runescape.wiki/images/Invocations_-_Dehydration_icon.png",
					"summary": "no healing potions (raid: nectar, ambrosia)",
					"data": {
						"healingPotionsDisabled": true
					}
				},
				{
					"id": 20,
					"name": "Overly Draining",
					"description": "All special attacks use 100% of your special attack energy.",
					"level": 15,
					"icon": "https://oldschool.runescape.wiki/images/Invocations_-_Overly_Draining_icon.png",
					"summary": "all specs cost 100% energy",
					"data": {
						"specialAttackEnergyOverride": true
					}
				}
			]
		},
		{
			"title": "Akkha",
			"unique": false,
			"boss": true,
			"icon": "https://oldschool.runescape.wiki/images/Akkha_icon.png",
			"list": [
				{
					"id": 21,
					"name": "Double Trouble",
					"description": "Akkha will do two special attacks at once.",
					"level": 20,
					"summary": "two specials are done at once"
				},
				{
					"id": 22,
					"name": "Keep Back",
					"description": "Akkha's ranged and magic attacks will also do melee damage to anyone next to him.",
					"level": 10,
					"summary": "range + magic attacks do melee splash"
				},
				{
					"id": 23,
					"name": "Stay Vigilant",
					"description": "Akkha will randomly swap between attack styles and protection prayers rather than at set intervals.",
					"level": 15,
					"summary": "prayer and attack style swap timing is random (⚠ applies to P3 warden)"
				},
				{
					"id": 24,
					"name": "Feeling Special?",
					"description": "Akkha's detonate special attack will trigger in more directions, his memory special attack will be faster and his trail special attack will spawn additional orbs.",
					"level": 20,
					"summary": "detonate in more directions, 2t switch during simon says, more spawn orbs in front of player"
				}
			]
		},
		{
			"title": "Zebak",
			"unique": false,
			"boss": true,
			"icon": "https://oldschool.runescape.wiki/images/Zebak_icon.png",
			"list": [
				{
					"id": 25,
					"name": "Not Just a Head",
					"description": "Zebak will gain access to blood magic.",
					"level": 15,
					"summary": "casts blood blitz + spawns a blood cloud"
				},
				{
					"id": 26,
					"name": "Arterial Spray",
					"description": "The radius and healing of Zebak's blood magic will be increased.",
					"level": 10,
					"summary": "blood magic has more damage and range",
					"requires": ["Not Just a Head"]
				},
				{
					"id": 27,
					"name": "Blood Thinners",
					"description": "Zebak's blood magic spawns will be split into three.",
					"level": 5,
					"summary": "three blood spawns instead of one",
					"requires": ["Not Just a Head"]
				},
				{
					"id": 28,
					"name": "Upset Stomach",
					"description": "Zebak's acid pools will have increased spread and jugs will be less effective.",
					"level": 15,
					"summary": "acid pools are bigger, jugs wash away 3x3 instead of 5x5 area"
				}
			]
		},
		{
			"title": "Ba-Ba",
			"unique": false,
			"boss": true,
			"icon": "https://oldschool.runescape.wiki/images/Ba-Ba_icon.png",
			"list": [
				{
					"id": 29,
					"name": "Mind the Gap!",
					"description": "The pit at the entrance to Ba-Ba's room will be a lethal fall (instant kill).",
					"level": 10,
					"summary": "entrance pit is instadeath"
				},
				{
					"id": 30,
					"name": "Gotta Have Faith",
					"description": "Ba-Ba's sarcophagus energy will deal bonus damage based on how many prayer points you're missing.",
					"level": 10,
					"summary": "sarcophagi damage is higher with less prayer"
				},
				{
					"id": 31,
					"name": "Jungle Japes",
					"description": "Ba-Ba's baboons will occasionally drop a banana peel on the floor. If the peels are stepped or run over, the player takes 20-25 damage and is left stunned for 3 seconds.",
					"level": 5,
					"summary": "monkeys drop banana peels - stun when stepped on"
				},
				{
					"id": 32,
					"name": "Shaking Things Up",
					"description": "The AoE from Ba-Ba's slam has its AoE increased from 5x5 to 7x7.",
					"level": 10,
					"summary": "larger slam aoe"
				},
				{
					"id": 33,
					"name": "Boulderdash",
					"description": "Ba-Ba's rolling boulders will move quicker and spawn slightly faster.",
					"level": 10,
					"summary": "boulders spawn and roll faster"
				}
			]
		},
		{
			"title": "Kephri",
			"unique": false,
			"boss": true,
			"icon": "https://oldschool.runescape.wiki/images/Kephri_icon.png",
			"list": [
				{
					"id": 34,
					"name": "Lively Larvae",
					"description": "More of the eggs launched during the Mass Incubation attack will be dark brown (hatches Agile Scarabs).",
					"level": 5,
					"summary": "more eggs that hatch scarabs"
				},
				{
					"id": 35,
					"name": "More Overlords",
					"description": "An additional scarab reinforcement is added during the shield charging phases; the first shield phase adds a Soldier Scarab, while the second shield phase adds a Spitting Scarab.",
					"level": 15,
					"summary": "one more big scarab during charge phases"
				},
				{
					"id": 36,
					"name": "Blowing Mud",
					"description": "Kephri's dung special will be twice as potent.",
					"level": 10,
					"summary": "dung attack targets +1 player (no effect in solo)"
				},
				{
					"id": 37,
					"name": "Medic!",
					"description": "Kephri will have continuous shield scarab spawns.",
					"level": 15,
					"summary": "healing swarms spawn even out of charge phases"
				},
				{
					"id": 38,
					"name": "Aerial Assault",
					"description": "Kephri's main attack will do significantly more damage and AoE increased from 1x1 to 3x3.",
					"level": 10,
					"summary": "fireball attack is 3x3 and does more damage (⚠ applies to P3 warden)"
				}
			]
		},
		{
			"title": "Wardens",
			"unique": false,
			"boss": true,
			"icon": "https://oldschool.runescape.wiki/images/Tumeken%27s_Warden_icon.png",
			"list": [
				{
					"id": 39,
					"name": "Ancient Haste",
					"description": "The Wardens will charge at a faster rate in the first phase of the fight.",
					"level": 10,
					"summary": "P1: faster obelisk charge"
				},
				{
					"id": 40,
					"name": "Acceleration",
					"description": "The Wardens will attack quicker and the obelisk will charge at a faster rate in the second phase of the fight.",
					"level": 10,
					"summary": "P2: faster obelisk charge and warden attacks"
				},
				{
					"id": 41,
					"name": "Penetration",
					"description": "The Wardens obelisk attacks will be significantly more potent in the second phase of the fight.",
					"level": 10,
					"summary": "P2: more obelisk damage, disables prayers"
				},
				{
					"id": 42,
					"name": "Overclocked",
					"description": "The Warden will attack faster in the final phase of the fight.",
					"level": 10,
					"summary": "P3: 1t faster slam"
				},
				{
					"id": 43,
					"name": "Overclocked 2",
					"description": "The Wardens will attack faster in the second phase of the fight.",
					"level": 10,
					"summary": "P3: 2t faster slam",
					"requires": ["Overclocked"]
				},
				{
					"id": 44,
					"name": "Insanity",
					"description": "The Warden will become unstoppable. Not for the faint of heart.",
					"level": 50,
					"summary": "P3: 3t faster slam, faster red skulls, lightning, tiles falloff rate, and slams continue instead of resetting",
					"requires": ["Overclocked", "Overclocked 2"]
				}
			]
		}
	]
};

export default data;
