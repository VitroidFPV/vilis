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
const searchInput = ref("")
const searchTerm = ref("")
const searchForm = ref<HTMLFormElement | null>(null)
const searchOpen = ref(false)
const searchLoading = ref(false)
const searchError = ref(false)
const suggestions = ref<SearchSuggestion[]>([])
const suggestionTotal = ref(0)
type SearchSuggestion = {
	alzaId: number
	name: string
	url: string
	imageUrl: string | null
	priceAfterCoupon: number
	priceWithoutCoupon: number
	discountPct: number
	couponCode: string
}
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
const currency = new Intl.NumberFormat("cs-CZ", {
	style: "currency",
	currency: "CZK",
	maximumFractionDigits: 0,
})

watch([sortBy, minDiscount, maxPrice], () => {
	productPage.value = 1
})

function clearFilters() {
	minDiscount.value = "0"
	maxPrice.value = "0"
}

watch(searchInput, (value, _oldValue, onCleanup) => {
	const term = value.trim()
	suggestions.value = []
	suggestionTotal.value = 0
	searchError.value = false
	if (!term) {
		searchLoading.value = false
		searchOpen.value = false
		return
	}
	searchOpen.value = true
	searchLoading.value = true
	const controller = new AbortController()
	const timer = setTimeout(async () => {
		try {
			const result = await $fetch<{
				products: SearchSuggestion[]
				total: number
			}>("/api/products", {
				query: { q: term, limit: 5 },
				signal: controller.signal,
			})
			if (controller.signal.aborted) return
			suggestions.value = result.products
			suggestionTotal.value = result.total
		} catch {
			if (!controller.signal.aborted) searchError.value = true
		} finally {
			if (!controller.signal.aborted) searchLoading.value = false
		}
	}, 250)
	onCleanup(() => {
		clearTimeout(timer)
		controller.abort()
	})
})

function onSearchPointerDown(event: PointerEvent) {
	if (!searchForm.value?.contains(event.target as Node))
		searchOpen.value = false
}

onMounted(() => document.addEventListener("pointerdown", onSearchPointerDown))
onBeforeUnmount(() =>
	document.removeEventListener("pointerdown", onSearchPointerDown),
)

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

function submitSearch() {
	productPage.value = 1
	searchTerm.value = searchInput.value.trim()
	searchOpen.value = false
}

function clearSearch() {
	searchInput.value = ""
	submitSearch()
}
</script>

<template>
	<UApp :locale="cs">
		<main class="min-h-screen flex flex-col bg-neutral-950">
			<div
				class="relative flex w-full shrink-0 flex-wrap items-center gap-2 p-2 pl-4 lg:flex-nowrap"
			>
				<div class="flex w-full shrink-0 items-center gap-2 lg:w-48 xl:w-64">
					<img src="/favicon.svg" class="size-6" />
					<span class="text-primary-500 font-semibold mr-2">Vilis</span>
					<span class="text-neutral-500">Alza Slevy</span>
				</div>
				<div
					class="flex min-w-0 w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-1 lg:flex-nowrap"
				>
					<form
						ref="searchForm"
						role="search"
						class="relative w-full sm:w-auto lg:shrink-0"
						@submit.prevent="submitSearch"
					>
						<UFieldGroup class="w-full">
							<UInput
								v-model="searchInput"
								placeholder="Hledat slevy"
								aria-label="Hledat slevy"
								aria-controls="search-suggestions"
								:aria-expanded="searchOpen && !!searchInput.trim()"
								maxlength="100"
								class="w-full sm:w-64 lg:w-52 xl:w-72 2xl:w-96"
								@focus="searchOpen = !!searchInput.trim()"
								@keydown.esc="searchOpen = false"
							>
								<template v-if="searchInput?.length" #trailing>
									<UButton
										icon="i-lucide-x"
										color="neutral"
										variant="link"
										type="button"
										aria-label="Vymazat hledání"
										size="sm"
										@click="clearSearch"
									/>
								</template>
							</UInput>
							<UButton
								icon="i-lucide-search"
								color="neutral"
								variant="soft"
								type="submit"
								aria-label="Hledat"
							/>
						</UFieldGroup>
						<div
							v-if="searchOpen && searchInput.trim()"
							id="search-suggestions"
							role="region"
							aria-label="Návrhy hledání"
							class="absolute top-full left-0 z-50 mt-2 max-h-[calc(100vh-4rem)] w-full overflow-y-auto rounded-2xl border border-neutral-700 bg-neutral-900 p-2 shadow-xl"
						>
							<p v-if="searchLoading" class="p-4 text-sm text-neutral-400">
								Vyhledávání…
							</p>
							<p v-else-if="searchError" class="p-4 text-sm text-red-400">
								Návrhy se nepodařilo načíst.
							</p>
							<p
								v-else-if="!suggestions.length"
								class="p-4 text-sm text-neutral-400"
							>
								Žádné odpovídající slevy.
							</p>
							<div v-else class="flex flex-col gap-2">
								<a
									v-for="product in suggestions"
									:key="product.alzaId"
									:href="product.url"
									target="_blank"
									rel="noopener noreferrer"
									class="group flex items-center gap-3 rounded-xl border border-neutral-700 p-1 transition-colors duration-200 hover:border-primary-500/70 hover:bg-neutral-800/50 focus-visible:border-primary-500/70 focus-visible:bg-neutral-800/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400"
									@click="searchOpen = false"
								>
									<div
										class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-2"
									>
										<img
											v-if="product.imageUrl"
											:src="product.imageUrl"
											alt=""
											class="size-full object-contain motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105 motion-safe:group-focus-visible:scale-105"
											loading="lazy"
										/>
									</div>
									<div class="min-w-0 flex-1 py-1 pr-2">
										<div
											class="line-clamp-2 text-sm font-semibold leading-tight"
										>
											{{ product.name }}
										</div>
										<div
											class="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
										>
											<span class="font-bold">{{
												currency.format(product.priceAfterCoupon)
											}}</span>
											<span class="text-xs text-neutral-400 line-through">{{
												currency.format(product.priceWithoutCoupon)
											}}</span>
										</div>
										<div class="mt-1 flex items-center gap-2 text-xs">
											<span class="text-neutral-300"
												>-{{ product.discountPct }}%</span
											>
											<span class="font-semibold">{{
												product.couponCode
											}}</span>
											<UIcon
												name="i-lucide-arrow-up-right"
												class="ml-auto text-sm transition-colors duration-200 group-hover:text-primary-400 group-focus-visible:text-primary-400"
											/>
										</div>
									</div>
								</a>
								<button
									type="submit"
									class="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-primary-400 hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400"
								>
									Zobrazit výsledky ({{ suggestionTotal }})
								</button>
							</div>
						</div>
					</form>
					<div
						class="flex w-full min-w-0 items-center gap-2 lg:w-auto lg:flex-none"
						aria-label="Řazení a filtry"
					>
						<div
							class="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto lg:flex-none lg:overflow-visible"
						>
							<USelect
								v-model="sortBy"
								:items="sortOptions"
								aria-label="Řadit produkty"
								class="min-w-44 shrink-0 lg:w-32 lg:min-w-0 xl:w-auto xl:min-w-44"
							/>
							<USelect
								v-model="minDiscount"
								:items="discountOptions"
								aria-label="Minimální sleva"
								class="min-w-44 shrink-0 lg:w-32 lg:min-w-0 xl:w-auto xl:min-w-44"
							/>
							<USelect
								v-model="maxPrice"
								:items="priceOptions"
								aria-label="Maximální cena"
								class="min-w-44 shrink-0 lg:w-32 lg:min-w-0 xl:w-auto xl:min-w-44"
							/>
						</div>
						<UButton
							v-if="hasActiveFilters"
							icon="i-lucide-x"
							aria-label="Vymazat filtry"
							title="Vymazat filtry"
							color="neutral"
							variant="ghost"
							class="shrink-0"
							@click="clearFilters"
						/>
					</div>
				</div>
				<div
					class="absolute right-2 top-2 flex items-center justify-end gap-2 lg:static"
				>
					<UModal>
						<UButton icon="i-lucide-settings" color="neutral"></UButton>
					</UModal>
				</div>
			</div>
			<div
				class="flex flex-1 flex-col gap-1 pl-4 lg:flex-row"
				@mouseleave="activeIndex = null"
			>
				<div class="w-full min-w-0 pt-2 lg:w-64 lg:shrink-0 lg:pt-4">
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
					class="relative min-w-0 flex-1 border-t border-l border-neutral-700 rounded-tl-3xl bg-neutral-900"
				>
					<section class="p-4">
						<!-- <div class="mb-5 flex flex-wrap items-center gap-3">
							<h1 class="text-xl font-semibold">Slevy Alza dny</h1>
							<span
								v-if="deals?.run && dealsStatus !== 'pending'"
								class="text-sm text-neutral-400"
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
						<p v-if="dealsStatus === 'pending'" class="text-neutral-400">
							Načítání slev…
						</p>
						<p v-else-if="dealsError" class="text-red-400">
							Slevy se nepodařilo načíst.
						</p>
						<p v-else-if="!deals?.products.length" class="text-neutral-400">
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
							<a
								v-for="product in deals.products"
								:key="product.alzaId"
								:href="product.url"
								target="_blank"
								rel="noopener noreferrer"
								class="group overflow-clip rounded-2xl border border-neutral-700 p-1 transition-colors duration-200 hover:border-primary-500/70 hover:bg-neutral-800/50 focus-visible:border-primary-500/70 focus-visible:bg-neutral-800/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400"
							>
								<div class="bg-white py-4 rounded-xl">
									<img
										v-if="product.imageUrl"
										:src="product.imageUrl"
										:alt="product.name"
										class="mb-3 h-40 w-full object-contain motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-102 motion-safe:group-focus-visible:scale-102"
										loading="lazy"
									/>
								</div>
								<div class="flex flex-col gap-2 px-2 py-3">
									<h2 class="line-clamp-2 font-semibold">{{ product.name }}</h2>
									<div class="flex gap-2 items-end">
										<div class="text-2xl font-bold">
											{{ currency.format(product.priceAfterCoupon) }}
										</div>
										<div class="text-sm text-neutral-400 line-through">
											{{ currency.format(product.priceWithoutCoupon) }}
										</div>
									</div>
									<div class="flex gap-2 items-center mt-2">
										<div class="text-neutral-300">
											-{{ product.discountPct }}%
										</div>
										<div class="font-semibold">{{ product.couponCode }}</div>
										<UIcon
											name="i-lucide-arrow-up-right"
											class="ml-auto transition-colors duration-200 group-hover:text-primary-400 group-focus-visible:text-primary-400 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-focus-visible:translate-x-0.5 motion-safe:group-focus-visible:-translate-y-0.5"
										/>
									</div>
								</div>
							</a>
						</div>
						<div
							v-if="deals?.run && deals.total > 0 && dealsStatus !== 'pending'"
							class="mt-6 flex items-center justify-end gap-3"
						>
							<UButton
								label="Předchozí"
								color="neutral"
								variant="soft"
								:disabled="productPage === 1"
								@click="productPage--"
							/>
							<span class="text-sm text-neutral-400"
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
						class="mb-4 max-w-full rounded-xl lg:absolute lg:inset-y-1 lg:left-1 lg:mb-0 lg:w-xl lg:max-w-[calc(100%-0.5rem)] lg:overflow-y-auto"
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
