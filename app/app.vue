<script setup lang="ts">
import { cs } from "@nuxt/ui/locale"
import categories from "./data/catalog.json"

const activeIndex = ref<number | null>(null)
const activeCategory = computed(() =>
	activeIndex.value === null ? null : categories[activeIndex.value],
)
const productPage = ref(1)
const sortBy = ref("name")
const minDiscount = ref("0")
const maxPrice = ref("0")
const sortOptions = [
	{ label: "Řadit: Podle názvu", value: "name" },
	{ label: "Řadit: Největší sleva", value: "discount" },
	{ label: "Řadit: Nejnižší cena", value: "priceAsc" },
	{ label: "Řadit: Nejvyšší cena", value: "priceDesc" },
]
const discountOptions = [
	{ label: "Sleva: Libovolná", value: "0" },
	{ label: "Sleva: Alespoň 20 %", value: "20" },
	{ label: "Sleva: Alespoň 30 %", value: "30" },
	{ label: "Sleva: Alespoň 40 %", value: "40" },
	{ label: "Sleva: Alespoň 50 %", value: "50" },
]
const priceOptions = [
	{ label: "Cena: Libovolná", value: "0" },
	{ label: "Cena: Do 1 000 Kč", value: "1000" },
	{ label: "Cena: Do 5 000 Kč", value: "5000" },
	{ label: "Cena: Do 10 000 Kč", value: "10000" },
	{ label: "Cena: Do 20 000 Kč", value: "20000" },
]
const hasActiveFilters = computed(
	() => minDiscount.value !== "0" || maxPrice.value !== "0",
)
const searchTerm = ref("")
const mobileControlsOpen = ref(false)
const {
	data: deals,
	status: dealsStatus,
	error: dealsError,
} = await useFetch("/api/products", {
	query: {
		page: productPage,
		q: searchTerm,
		sort: sortBy,
		minDiscount,
		maxPrice,
	},
})
watch([sortBy, minDiscount, maxPrice], () => {
	productPage.value = 1
})

function toggleMobileControls() {
	mobileControlsOpen.value = !mobileControlsOpen.value
}

function clearFilters() {
	minDiscount.value = "0"
	maxPrice.value = "0"
}

function onNavLeave(event: MouseEvent) {
	if (
		window.matchMedia("(min-width: 1024px)").matches &&
		event.clientY >=
			(event.currentTarget as HTMLElement).getBoundingClientRect().bottom
	) {
		activeIndex.value = null
	}
}

function onCategoryEnter(index: number) {
	if (window.matchMedia("(min-width: 1024px)").matches)
		activeIndex.value = index
}

function onCategoryClick(index: number) {
	if (!window.matchMedia("(min-width: 1024px)").matches)
		activeIndex.value = activeIndex.value === index ? null : index
}

function submitSearch(term: string) {
	productPage.value = 1
	searchTerm.value = term
}
</script>

<template>
	<UApp :locale="cs">
		<main
			class="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0"
		>
			<div
				class="relative flex w-full shrink-0 flex-wrap items-center gap-2 p-2 pl-4 lg:flex-nowrap"
			>
				<div class="flex w-full shrink-0 items-center gap-2 lg:w-48 xl:w-64">
					<img src="/favicon.svg" class="size-6" />
					<span class="text-primary-500 font-semibold mr-2">Vilis</span>
					<h1
						class="text-base font-normal text-neutral-500 dark:text-neutral-400"
					>
						Alza Slevy
					</h1>
				</div>
				<div
					class="fixed inset-x-0 bottom-0 z-40 flex w-full min-w-0 flex-col gap-0 rounded-t-[20px] border-t border-neutral-200 bg-neutral-50 pt-3 pr-[max(16px,env(safe-area-inset-right))] pb-[calc(12px+env(safe-area-inset-bottom))] pl-[max(16px,env(safe-area-inset-left))] dark:border-neutral-700 dark:bg-neutral-950 lg:static lg:z-auto lg:w-auto lg:flex-1 lg:flex-row lg:items-center lg:gap-2 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0"
				>
					<ProductSearch
						:mobile-controls-open="mobileControlsOpen"
						:has-active-filters="hasActiveFilters"
						@search="submitSearch"
						@toggle-controls="toggleMobileControls"
						@close-controls="mobileControlsOpen = false"
					/>
					<div
						class="order-1 grid w-full transition-[grid-template-rows,opacity,visibility] duration-[280ms,180ms,0s] ease-[cubic-bezier(0.22,1,0.36,1),ease,linear] motion-reduce:transition-none lg:visible lg:contents lg:opacity-100 lg:transition-none"
						:class="
							mobileControlsOpen
								? 'visible grid-rows-[1fr] opacity-100 delay-0'
								: 'invisible grid-rows-[0fr] opacity-0 delay-[0s,0s,280ms]'
						"
					>
						<div class="min-h-0 overflow-hidden lg:contents">
							<div
								id="browse-controls"
								class="mb-3 flex max-h-[calc(100dvh-8rem-env(safe-area-inset-bottom))] w-full min-w-0 flex-col gap-3 overflow-y-auto overscroll-contain border-b border-neutral-200 pb-3 dark:border-neutral-700 lg:mb-0 lg:max-h-none lg:w-auto lg:flex-1 lg:flex-row lg:items-center lg:gap-2 lg:overflow-visible lg:border-0 lg:pb-0"
								aria-label="Řazení a filtry"
							>
								<div
									class="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center"
								>
									<USelect
										v-model="sortBy"
										:items="sortOptions"
										:ui="{ item: 'min-h-11 lg:min-h-0' }"
										aria-label="Řadit produkty"
										class="min-h-11 w-full shrink-0 lg:min-h-0 lg:w-32 lg:min-w-0 xl:w-auto xl:min-w-44"
									/>
									<USelect
										v-model="minDiscount"
										:items="discountOptions"
										:ui="{ item: 'min-h-11 lg:min-h-0' }"
										aria-label="Minimální sleva"
										class="min-h-11 w-full shrink-0 lg:min-h-0 lg:w-32 lg:min-w-0 xl:w-auto xl:min-w-44"
									/>
									<USelect
										v-model="maxPrice"
										:items="priceOptions"
										:ui="{ item: 'min-h-11 lg:min-h-0' }"
										aria-label="Maximální cena"
										class="min-h-11 w-full shrink-0 lg:min-h-0 lg:w-32 lg:min-w-0 xl:w-auto xl:min-w-44"
									/>
								</div>
								<div class="flex items-center justify-between gap-2 lg:ml-auto">
									<UButton
										v-if="hasActiveFilters"
										icon="i-lucide-x"
										label="Vymazat filtry"
										aria-label="Vymazat filtry"
										color="neutral"
										variant="ghost"
										class="min-h-11 shrink-0 lg:min-h-0 lg:size-8 lg:justify-center lg:p-0"
										:ui="{ label: 'lg:hidden' }"
										@click="clearFilters"
									/>
									<SettingsMenu />
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div
				class="flex flex-1 flex-col gap-1 lg:flex-row lg:pl-4"
				@mouseleave="activeIndex = null"
			>
				<div class="hidden min-w-0 lg:block lg:w-64 lg:shrink-0 lg:pt-4">
					<nav
						aria-label="Kategorie"
						class="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible"
						@mouseleave="onNavLeave"
					>
						<UButton
							v-for="(category, index) in categories"
							:key="category.url"
							:label="category.name"
							:color="activeIndex === index ? 'primary' : 'neutral'"
							:variant="activeIndex === index ? 'soft' : 'ghost'"
							trailing-icon="i-lucide-chevron-right"
							class="w-auto shrink-0 justify-between whitespace-nowrap text-left lg:w-full lg:shrink"
							:aria-expanded="activeIndex === index"
							aria-controls="subcategories"
							@mouseenter="onCategoryEnter(index)"
							@click="onCategoryClick(index)"
						/>
					</nav>
				</div>

				<div
					class="relative min-w-0 flex-1 border-t border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 lg:rounded-tl-3xl lg:border-l"
				>
					<section class="p-4">
						<!-- <div class="mb-5 flex flex-wrap items-center gap-3">
							<h1 class="text-xl font-semibold">Slevy Alza dny</h1>
							<span
								v-if="deals?.run && dealsStatus !== 'pending'"
								class="text-sm text-neutral-500 dark:text-neutral-400"
							>
								{{
									searchTerm
										? `${deals.total} výsledků`
										: `${deals.run.productCount} produktů`
								}}
								·
								{{
									deals.run.scope === "sample"
										? `Ukázka z ${deals.run.pageCount} stránek`
										: "Úplný import"
								}}
							</span>
						</div> -->
						<p
							v-if="dealsStatus === 'pending'"
							class="text-neutral-500 dark:text-neutral-400"
						>
							Načítání slev…
						</p>
						<p v-else-if="dealsError" class="text-red-400">
							Slevy se nepodařilo načíst.
						</p>
						<p
							v-else-if="!deals?.products.length"
							class="text-neutral-500 dark:text-neutral-400"
						>
							{{
								searchTerm || hasActiveFilters
									? "Žádné slevy neodpovídají zadanému hledání a filtrům."
									: "Zatím nebyly importovány žádné slevy."
							}}
						</p>
						<div
							v-else
							class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
						>
							<ProductCard
								v-for="product in deals.products"
								:key="product.alzaId"
								:product="product"
							/>
						</div>
						<div
							v-if="deals?.run && deals.total > 0 && dealsStatus !== 'pending'"
							class="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-end"
						>
							<UButton
								label="Předchozí"
								color="neutral"
								variant="soft"
								:disabled="productPage === 1"
								@click="productPage--"
							/>
							<span class="text-sm text-neutral-500 dark:text-neutral-400"
								>Strana {{ productPage }} z
								{{ Math.ceil(deals.total / deals.limit) }}</span
							>
							<UButton
								label="Další"
								color="neutral"
								variant="soft"
								:disabled="productPage * deals.limit >= deals.total"
								@click="productPage++"
							/>
						</div>
					</section>
					<UCard
						v-if="activeCategory"
						id="subcategories"
						class="hidden mb-4 max-w-full rounded-xl lg:block lg:absolute lg:inset-y-1 lg:left-1 lg:mb-0 lg:w-xl lg:max-w-[calc(100%-0.5rem)] lg:overflow-y-auto"
						@mouseleave="activeIndex = null"
					>
						<UButton
							icon="i-lucide-x"
							aria-label="Zavřít podkategorie"
							color="neutral"
							variant="ghost"
							class="float-right lg:hidden"
							@click="activeIndex = null"
						/>
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
