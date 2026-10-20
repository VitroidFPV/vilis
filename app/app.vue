<script setup lang="ts">
import categories from "./data/catalog.json"

const activeIndex = ref<number | null>(null)
const activeCategory = computed(() =>
	activeIndex.value === null ? null : categories[activeIndex.value],
)
const productPage = ref(1)
const {
	data: deals,
	status: dealsStatus,
	error: dealsError,
} = await useFetch("/api/products", { query: { page: productPage } })
const currency = new Intl.NumberFormat("cs-CZ", {
	style: "currency",
	currency: "CZK",
	maximumFractionDigits: 0,
})

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
					<img src="/favicon.svg" class="size-6" />
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
					<section class="p-6">
						<div class="mb-5 flex flex-wrap items-center gap-3">
							<h1 class="text-xl font-semibold">Alza Dny deals</h1>
							<span v-if="deals?.run" class="text-sm text-neutral-400">
								{{ deals.run.productCount }} products ·
								{{
									deals.run.scope === "sample"
										? `Sample from ${deals.run.pageCount} pages`
										: "Full import"
								}}
							</span>
						</div>
						<p v-if="dealsStatus === 'pending'" class="text-neutral-400">
							Loading deals…
						</p>
						<p v-else-if="dealsError" class="text-red-400">
							Could not load deals.
						</p>
						<p v-else-if="!deals?.products.length" class="text-neutral-400">
							No deals imported yet.
						</p>
						<div
							v-else
							class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
						>
							<a
								v-for="product in deals.products"
								:key="product.alzaId"
								:href="product.url"
								target="_blank"
								rel="noopener noreferrer"
								class="rounded-xl border border-neutral-700 bg-neutral-800 p-4 hover:border-primary-500"
							>
								<img
									v-if="product.imageUrl"
									:src="product.imageUrl"
									:alt="product.name"
									class="mb-3 h-40 w-full object-contain"
									loading="lazy"
								/>
								<h2 class="line-clamp-2 font-medium">{{ product.name }}</h2>
								<div class="mt-3 text-lg font-semibold text-primary-400">
									{{ currency.format(product.priceAfterCoupon) }}
								</div>
								<div class="text-sm text-neutral-400 line-through">
									{{ currency.format(product.priceWithoutCoupon) }}
								</div>
								<div class="mt-2 text-sm text-neutral-300">
									{{ product.couponCode }} · {{ product.discountPct }}% off
								</div>
							</a>
						</div>
						<div
							v-if="deals?.run"
							class="mt-6 flex items-center justify-end gap-3"
						>
							<UButton
								label="Previous"
								color="neutral"
								variant="soft"
								:disabled="productPage === 1"
								@click="productPage--"
							/>
							<span class="text-sm text-neutral-400"
								>Page {{ productPage }} of
								{{ Math.ceil(deals.run.productCount / deals.limit) }}</span
							>
							<UButton
								label="Next"
								color="neutral"
								variant="soft"
								:disabled="productPage * deals.limit >= deals.run.productCount"
								@click="productPage++"
							/>
						</div>
					</section>
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
