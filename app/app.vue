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
		<main class="min-h-screen flex flex-col bg-neutral-950">
			<div class="p-2 pl-4 w-full shrink-0 nav flex">
				<div class="gap-2 items-center flex w-64 shrink-0">
					<img src="/favicon.svg" class="size-6"/>
					<span class="text-primary-500 font-semibold mr-2">Vilis</span>
					<span class="text-neutral-500">Alza Slevy</span>
				</div>
				<div class="flex w-full items-center">
					<UFieldGroup>
						<UInput />
						<UButton icon="i-lucide-search" color="neutral" variant="subtle" />
					</UFieldGroup>
					<div>
						<!-- filtering options -->
					</div>
				</div>
				<div class="flex gap-2 items-center justify-end">
					<UModal>
						<UButton icon="i-lucide-settings" color="neutral"></UButton>
					</UModal>
				</div>
			</div>
			<div class="flex flex-1 gap-1 pl-4" @mouseleave="activeIndex = null">
				<div class="w-64 shrink-0 pt-4">
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
				</div>

				<div
					class="relative min-w-0 flex-1 border-t border-l border-neutral-700 rounded-tl-2xl bg-neutral-900"
				>
					<UCard
						v-if="activeCategory"
						id="subcategories"
						class="absolute inset-y-1 left-1 w-xl max-w-[calc(100%-0.5rem)] overflow-y-auto rounded-xl"
						@mouseleave="activeIndex = null"
					>
						<h2 class="mb-5 font-semibold">
							{{ activeCategory.name }}
						</h2>
						<div class="grid gap-6 sm:grid-cols-2">
							<section
								v-for="child in activeCategory.children"
								:key="child.url"
							>
								<h3 class="font-medium">{{ child.name }}</h3>
							</section>
						</div>
					</UCard>
				</div>
			</div>
		</main>
	</UApp>
</template>
