<script setup lang="ts">
import categories from "./data/catalog.json"

const activeIndex = ref<number | null>(null)
const activeCategory = computed(() =>
	activeIndex.value === null ? null : categories[activeIndex.value],
)
const productPage = ref(1)
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
}
const {
	data: deals,
	status: dealsStatus,
	error: dealsError,
} = await useFetch("/api/products", {
	query: { page: productPage, q: searchTerm },
})
const currency = new Intl.NumberFormat("cs-CZ", {
	style: "currency",
	currency: "CZK",
	maximumFractionDigits: 0,
})

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
		event.clientY >=
		(event.currentTarget as HTMLElement).getBoundingClientRect().bottom
	) {
		activeIndex.value = null
	}
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
	<UApp>
		<main class="min-h-screen flex flex-col bg-neutral-950">
			<div class="p-2 pl-4 w-full shrink-0 nav flex">
				<div class="gap-2 items-center flex w-64 shrink-0">
					<img src="/favicon.svg" class="size-6" />
					<span class="text-primary-500 font-semibold mr-2">Vilis</span>
					<span class="text-neutral-500">Alza Slevy</span>
				</div>
				<div class="flex w-full items-center">
					<form
						ref="searchForm"
						role="search"
						class="relative"
						@submit.prevent="submitSearch"
					>
						<UFieldGroup>
							<UInput
								v-model="searchInput"
								placeholder="Search deals"
								aria-label="Search deals"
								aria-controls="search-suggestions"
								:aria-expanded="searchOpen && !!searchInput.trim()"
								maxlength="100"
								class="min-w-md"
								@focus="searchOpen = !!searchInput.trim()"
								@keydown.esc="searchOpen = false"
							>
								<template v-if="searchInput?.length" #trailing>
									<UButton
										icon="i-lucide-x"
										color="neutral"
										variant="link"
										type="button"
										aria-label="Clear search"
										size="sm"
										@click="clearSearch"
									/>
								</template>
							</UInput>
							<UButton
								icon="i-lucide-search"
								color="neutral"
								variant="subtle"
								type="submit"
								aria-label="Search"
							/>
						</UFieldGroup>
						<div
							v-if="searchOpen && searchInput.trim()"
							id="search-suggestions"
							role="region"
							aria-label="Search suggestions"
							class="absolute top-full left-0 z-50 mt-2 w-full overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-xl"
						>
							<p v-if="searchLoading" class="p-4 text-sm text-neutral-400">
								Searching…
							</p>
							<p v-else-if="searchError" class="p-4 text-sm text-red-400">
								Could not load suggestions.
							</p>
							<p
								v-else-if="!suggestions.length"
								class="p-4 text-sm text-neutral-400"
							>
								No matching deals.
							</p>
							<template v-else>
								<a
									v-for="product in suggestions"
									:key="product.alzaId"
									:href="product.url"
									target="_blank"
									rel="noopener noreferrer"
									class="flex items-center gap-3 border-b border-neutral-800 px-3 py-2 hover:bg-neutral-800 focus:bg-neutral-800"
									@click="searchOpen = false"
								>
									<img
										v-if="product.imageUrl"
										:src="product.imageUrl"
										alt=""
										class="size-12 shrink-0 object-contain"
										loading="lazy"
									/>
									<span class="min-w-0 flex-1 truncate text-sm">{{
										product.name
									}}</span>
									<span class="shrink-0 text-sm font-medium text-primary-400">
										{{ currency.format(product.priceAfterCoupon) }}
									</span>
								</a>
								<button
									type="submit"
									class="w-full px-3 py-2 text-left text-sm text-primary-400 hover:bg-neutral-800 focus:bg-neutral-800"
								>
									View all {{ suggestionTotal }} results
								</button>
							</template>
						</div>
					</form>
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
							<span
								v-if="deals?.run && dealsStatus !== 'pending'"
								class="text-sm text-neutral-400"
							>
								{{
									searchTerm
										? `${deals.total} results`
										: `${deals.run.productCount} products`
								}}
								·
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
							{{
								searchTerm
									? `No deals found for “${searchTerm}”.`
									: "No deals imported yet."
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
							v-if="deals?.run && deals.total > 0 && dealsStatus !== 'pending'"
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
								{{ Math.ceil(deals.total / deals.limit) }}</span
							>
							<UButton
								label="Next"
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
