<script setup lang="ts">
defineProps<{
	mobileControlsOpen: boolean
	hasActiveFilters: boolean
}>()

const emit = defineEmits<{
	search: [term: string]
	"toggle-controls": []
	"close-controls": []
}>()

const searchInput = ref("")
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

const currency = new Intl.NumberFormat("cs-CZ", {
	style: "currency",
	currency: "CZK",
	maximumFractionDigits: 0,
})

function onSearchFocus() {
	emit("close-controls")
	searchOpen.value = !!searchInput.value.trim()
}

function submitSearch() {
	emit("search", searchInput.value.trim())
	searchOpen.value = false
}

function toggleMobileControls() {
	searchOpen.value = false
	emit("toggle-controls")
}

function clearSearch() {
	searchInput.value = ""
	submitSearch()
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
</script>

<template>
	<form
		ref="searchForm"
		role="search"
		class="search-form relative order-2 flex w-full items-center gap-2 lg:order-none lg:w-auto lg:shrink-0"
		@submit.prevent="submitSearch"
	>
		<UFieldGroup class="min-w-0 flex-1 lg:w-full">
			<UInput
				v-model="searchInput"
				placeholder="Hledat slevy"
				aria-label="Hledat slevy"
				aria-controls="search-suggestions"
				:aria-expanded="searchOpen && !!searchInput.trim()"
				maxlength="100"
				class="min-w-0 flex-1 lg:w-52 lg:flex-none xl:w-72 2xl:w-96"
				:ui="{ base: 'min-h-11 text-base lg:min-h-0 lg:text-sm' }"
				@focus="onSearchFocus"
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
				class="min-w-11 justify-center lg:min-w-0"
			/>
		</UFieldGroup>
		<UButton
			:icon="
				mobileControlsOpen
					? 'i-lucide-chevron-down'
					: 'i-lucide-sliders-horizontal'
			"
			color="neutral"
			:variant="mobileControlsOpen ? 'solid' : 'soft'"
			type="button"
			:aria-label="
				mobileControlsOpen
					? 'Sbalit filtry a nastavení'
					: 'Rozbalit filtry a nastavení'
			"
			:aria-expanded="mobileControlsOpen"
			aria-controls="browse-controls"
			class="relative size-11 shrink-0 justify-center lg:hidden"
			@click="toggleMobileControls"
		>
			<span
				v-if="hasActiveFilters"
				class="absolute right-1 top-1 size-2 rounded-full bg-primary-400"
			/>
		</UButton>
		<div
			v-if="searchOpen && searchInput.trim()"
			id="search-suggestions"
			role="region"
			aria-label="Návrhy hledání"
			class="absolute max-h-[calc(100dvh-8rem-env(safe-area-inset-bottom))] overscroll-contain lg:max-h-[calc(100vh-4rem)] bottom-full left-0 z-50 mb-3 w-full overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl dark:border-neutral-700 dark:bg-neutral-900 lg:bottom-auto lg:top-full lg:mb-0 lg:mt-2"
		>
			<p
				v-if="searchLoading"
				class="p-4 text-sm text-neutral-500 dark:text-neutral-400"
			>
				Vyhledávání…
			</p>
			<p v-else-if="searchError" class="p-4 text-sm text-red-400">
				Návrhy se nepodařilo načíst.
			</p>
			<p
				v-else-if="!suggestions.length"
				class="p-4 text-sm text-neutral-500 dark:text-neutral-400"
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
					class="group flex items-center gap-3 rounded-xl border border-neutral-200 p-1 transition-colors duration-200 hover:border-primary-500/70 hover:bg-neutral-100 focus-visible:border-primary-500/70 focus-visible:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 dark:border-neutral-700 dark:hover:bg-neutral-800/50 dark:focus-visible:bg-neutral-800/50"
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
						<div class="line-clamp-2 text-sm font-semibold leading-tight">
							{{ product.name }}
						</div>
						<div class="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
							<span class="font-bold">{{
								currency.format(product.priceAfterCoupon)
							}}</span>
							<span
								class="text-xs text-neutral-500 line-through dark:text-neutral-400"
								>{{ currency.format(product.priceWithoutCoupon) }}</span
							>
						</div>
						<div class="mt-1 flex items-center gap-2 text-xs">
							<span class="text-neutral-600 dark:text-neutral-300"
								>-{{ product.discountPct }}%</span
							>
							<span class="font-semibold">{{ product.couponCode }}</span>
							<UIcon
								name="i-lucide-arrow-up-right"
								class="ml-auto text-sm transition-colors duration-200 group-hover:text-primary-400 group-focus-visible:text-primary-400"
							/>
						</div>
					</div>
				</a>
				<button
					type="submit"
					class="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-primary-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 dark:text-primary-400 dark:hover:bg-neutral-800"
				>
					Zobrazit výsledky ({{ suggestionTotal }})
				</button>
			</div>
		</div>
	</form>
</template>
