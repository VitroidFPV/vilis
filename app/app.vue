<script setup lang="ts">
import categories from "./data/catalog.json"

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
						:key="category.url"
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
						<section v-for="child in activeCategory.children" :key="child.url">
							<h3 class="font-medium">{{ child.name }}</h3>
						</section>
					</div>
				</UCard>
			</div>
		</main>
	</UApp>
</template>
