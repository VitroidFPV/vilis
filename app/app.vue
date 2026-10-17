<script setup lang="ts">
const categories = [
	{
		name: "Apple",
		groups: [
			{
				name: "New Apple Products",
				items: [
					"iPhone Duo",
					"iPhone 18 Pro Max",
					"iPhone 18 Pro",
					"Series 12",
					"Ultra 4",
				],
			},
			{
				name: "iPhone",
				items: [
					"iPhone Duo",
					"iPhone 18",
					"iPhone 17",
					"iPhone Air",
					"iPhone 16",
				],
			},
			{
				name: "iPad",
				items: ["iPad 2025", "iPad Pro", "iPad Air", "iPad mini", "iPad 2021"],
			},
			{
				name: "Apple Watch",
				items: ["Series 12", "Ultra", "SE", "Accessories"],
			},
			{
				name: "MacBook",
				items: ["MacBook Air", "MacBook Pro", "MacBook Accessories"],
			},
			{ name: "Headphones", items: [] },
			{ name: "Mac", items: ["iMac", "Mac Studio", "Mac mini", "Accessories"] },
			{
				name: "Apple HomeKit",
				items: [
					"Voice Assistants",
					"Security System",
					"Electrical Installation",
					"Smart Heating & Cooling",
					"Weather Stations",
				],
			},
		],
	},
	{
		name: "Phones, Smart Watches, Tablets",
		groups: [
			{ name: "Alza Days - Samsung", items: [] },
			{ name: "Alza Days", items: [] },
			{
				name: "New Apple Products",
				items: [
					"iPhone Duo",
					"iPhone 18 Pro Max",
					"iPhone 18 Pro",
					"Series 12",
					"Ultra 4",
				],
			},
			{ name: "Xiaomi New Releases", items: [] },
			{
				name: "Mobile Phones",
				items: ["Apple News", "iPhones", "Samsung", "Google", "Xiaomi"],
			},
			{
				name: "Smart Watches",
				items: ["Apple Watch", "Garmin", "Samsung", "Huawei", "Amazfit"],
			},
			{
				name: "Tablets",
				items: ["iPad", "Samsung", "Lenovo", "Android", "Gaming"],
			},
			{
				name: "Smart Rings",
				items: ["Oura", "Samsung", "Luna", "ULTRAHUMAN", "Payment Rings"],
			},
			{ name: "eBook Readers", items: [] },
			{ name: "Self-Monitoring Wearable Tech", items: [] },
			{ name: "Phone Accessories", items: [] },
			{ name: "Tablet Accessories", items: [] },
			{ name: "Smart Watch Accessories", items: [] },
			{ name: "New Samsung Products", items: [] },
		],
	},
	{
		name: "Computers and Laptops",
		groups: [
			{ name: "Alza Days - Samsung", items: [] },
			{ name: "Alza Days", items: [] },
			{
				name: "Laptops",
				items: ["Gaming", "Home & Office", "Professional", "MacBook", "Lenovo"],
			},
			{
				name: "Computers",
				items: [
					"AlzaPC",
					"Gaming",
					"Mini PCs",
					"Regular Size",
					"All-In-One PCs",
				],
			},
			{
				name: "Components",
				items: [
					"Graphics Cards",
					"Processors",
					"Memory",
					"Storage Drives & SSDs",
					"Motherboards",
				],
			},
			{
				name: "Monitors",
				items: [
					"Sorted by Size",
					"Gaming",
					"Office",
					"Graphics and Photos",
					"Smart Monitors",
				],
			},
			{
				name: "Network Hardware",
				items: [
					"WiFi Routers & AP",
					"Mesh WiFi Systems",
					"Extenders",
					"Routers & Firewalls",
					"230V Sockets",
				],
			},
			{
				name: "Printers and Scanners",
				items: [
					"Printers",
					"3D Print",
					"Toners & Inks",
					"Scanners",
					"Point of Sale Systems",
				],
			},
			{ name: "Software", items: [] },
			{ name: "Projectors", items: [] },
			{ name: "Accessories", items: [] },
			{ name: "VR Glasses", items: [] },
			{ name: "3D Print", items: [] },
		],
	},
	{
		name: "Gaming and Entertainment",
		groups: [
			{ name: "Alza Days", items: [] },
			{
				name: "PlayStation",
				items: [
					"PlayStation 5",
					"PlayStation 4",
					"Consoles",
					"Games",
					"PlayStation",
				],
			},
			{
				name: "Xbox",
				items: ["Xbox Series", "Xbox ONE", "Consoles", "Accessories", "Games"],
			},
			{
				name: "Nintendo Switch",
				items: [
					"Nintendo Switch 2",
					"Console",
					"Games",
					"Accessories",
					"Nintendo Switch Online",
				],
			},
			{
				name: "PC Gaming",
				items: [
					"Games",
					"Gaming PCs",
					"Laptops",
					"Gaming Alza PCs",
					"Monitors",
				],
			},
			{
				name: "Components",
				items: [
					"Graphics Cards",
					"Processors",
					"Memory",
					"Storage Drives & SSDs",
					"Motherboards",
				],
			},
			{
				name: "Gaming Laptops",
				items: ["Under CZK 20,000", "Upper Mid Priced"],
			},
			{
				name: "Gaming Accessories",
				items: [
					"For PC",
					"Nintendo Switch",
					"Gaming Controllers & Wheels",
					"Keyboards",
					"Mice",
				],
			},
			{ name: "Console & PC Games", items: [] },
			{ name: "Virtual Reality", items: [] },
			{ name: "Consoles", items: [] },
			{ name: "Fan Merchandise and Collectibles", items: [] },
			{ name: "Board Games & Tabletop Games", items: [] },
		],
	},
	{
		name: "TV, Photo, Audio & Video",
		groups: [
			{ name: "AlzaPlus+ Deals", items: [] },
			{ name: "Alza Days - Samsung", items: [] },
			{ name: "Alza Days", items: [] },
			{
				name: "Televisions",
				items: [
					"New Range 2026",
					"By Screen Size",
					"Smart TV",
					"4K Ultra HD",
					"OLED",
				],
			},
			{
				name: "Headphones",
				items: ["Wireless", "True Wireless", "Gaming", "Wired", "In-Ear"],
			},
			{
				name: "Speakers",
				items: ["Wireless", "For Computer", "TV", "Party", "Outdoor"],
			},
			{ name: "Soundbars", items: ["Dolby Atmos", "Soundbar Speakers"] },
			{
				name: "Digital Cameras",
				items: [
					"For Beginners",
					"Professional",
					"Mirrorless Cameras",
					"Compact",
					"DSLR",
				],
			},
			{ name: "Video Cameras", items: [] },
			{ name: "Players", items: [] },
			{ name: "Microphones", items: [] },
			{ name: "Drones", items: [] },
			{ name: "Musical Instruments", items: [] },
			{ name: "Hi-Fi Components", items: [] },
			{ name: "Radios", items: [] },
			{ name: "Magnifying Optical Instruments", items: [] },
			{ name: "Projectors", items: [] },
		],
	},
	{
		name: "Major Appliances",
		groups: [
			{ name: "Alza Days - Samsung", items: [] },
			{ name: "Alza Days", items: [] },
			{
				name: "Washing Machines",
				items: ["Front-Load", "Top-Load", "Slim", "Steam", "Smart"],
			},
			{
				name: "Tumble Dryers",
				items: [
					"Condenser (Conventional Dryers)",
					"Narrow/Slim",
					"Steam",
					"With Heat Pump",
					"Smart",
				],
			},
			{
				name: "Refrigerators",
				items: [
					"With Freezer",
					"Monoclimatic",
					"American",
					"Small",
					"Built-In",
				],
			},
			{
				name: "Freezers",
				items: ["Drawer", "Chest", "Built-In", "Small", "Energy-Efficient"],
			},
			{
				name: "Dishwashers",
				items: ["Freestanding", "Built-In", "Narrow", "Standard", "Table Top"],
			},
			{
				name: "Built-In Ovens",
				items: [
					"Fan",
					"Steam",
					"Multifunction",
					"Self-Cleaning",
					"With Microwave Heating",
				],
			},
			{ name: "Cooktops", items: [] },
			{ name: "Microwave Ovens", items: [] },
			{ name: "Built-In Appliances", items: [] },
			{ name: "Cookers", items: [] },
			{ name: "Kitchen Hoods", items: [] },
			{ name: "Wine Coolers", items: [] },
			{ name: "Air Conditioners", items: [] },
			{ name: "Water Heaters", items: [] },
			{ name: "Appliance Sets", items: [] },
			{ name: "Energy-Efficient Appliances", items: [] },
			{ name: "Retro Appliances", items: [] },
			{ name: "Miele", items: [] },
			{ name: "dTest", items: [] },
			{ name: "Gastro Equipment", items: [] },
		],
	},
]

const activeIndex = ref<number | null>(null)
const activeCategory = computed(() =>
	activeIndex.value === null ? null : categories[activeIndex.value],
)

function onNavLeave(event: MouseEvent) {
	if (
		event.clientY >=
		(event.currentTarget as HTMLElement).getBoundingClientRect().bottom
	) {
		activeIndex.value = null
	}
}
</script>

<template>
	<UApp>
		<main class="p-4 sm:p-8">
			<h1 class="mb-6 text-xl font-semibold">Categories</h1>
			<div
				class="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]"
				@mouseleave="activeIndex = null"
			>
				<nav
					aria-label="Categories"
					class="flex flex-col gap-1 self-start"
					@mouseleave="onNavLeave"
				>
					<UButton
						v-for="(category, index) in categories"
						:key="category.name"
						:label="category.name"
						:color="activeIndex === index ? 'primary' : 'neutral'"
						:variant="activeIndex === index ? 'soft' : 'ghost'"
						trailing-icon="i-lucide-chevron-right"
						block
						class="justify-between text-left"
						:aria-expanded="activeIndex === index"
						aria-controls="subcategories"
						@mouseenter="activeIndex = index"
					/>
				</nav>
				<UCard v-if="activeCategory" id="subcategories">
					<h2 class="mb-5 font-semibold">
						{{ activeCategory.name }}
					</h2>
					<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						<section v-for="group in activeCategory.groups" :key="group.name">
							<h3 class="font-medium">{{ group.name }}</h3>
							<ul
								v-if="group.items.length"
								class="mt-2 space-y-1 text-sm text-muted"
							>
								<li v-for="item in group.items" :key="item">{{ item }}</li>
							</ul>
						</section>
					</div>
				</UCard>
			</div>
		</main>
	</UApp>
</template>
