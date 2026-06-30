<script lang="ts" module>
    let nextId = 0;
</script>

<script lang="ts">
    import { searchAirports, toSegmentAirport } from '$lib/db';
    import type { AirportRecord, AirportSnapshot } from '$lib/db';
    import { Check, MapPin, PencilLine, Search, X } from 'lucide-svelte';
    import { cn } from '$lib/utils';

    interface Props {
        value?: AirportSnapshot | undefined;
        id?: string;
        placeholder?: string;
        invalid?: boolean;
        onchange: (value: AirportSnapshot | undefined) => void;
    }

    let {
        value = undefined,
        id,
        placeholder = 'Search city or code (e.g. FCO)',
        invalid = false,
        onchange
    }: Props = $props();

    const uid = ++nextId;
    const listId = `airport-list-${uid}`;
    const optId = (i: number) => `${listId}-opt-${i}`;

    let searching = $state(false);
    let query = $state('');
    let results = $state<AirportRecord[]>([]);
    let open = $state(false);
    let activeIndex = $state(-1);
    let manual = $state(false);
    let manualName = $state('');
    let manualTz = $state('');
    let debounce: ReturnType<typeof setTimeout> | null = null;

    const showSearch = $derived(searching || !value);

    const chipLabel = $derived(
        value
            ? `${value.code ? `${value.code} ` : ''}${value.city ?? value.name ?? 'Airport'}`
            : ''
    );

    function runSearch(q: string) {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(async () => {
            const trimmed = q.trim();
            if (!trimmed) {
                results = [];
                return;
            }
            try {
                results = await searchAirports(trimmed, 7);
            } catch {
                results = [];
            }
        }, 140);
    }

    function onInput(event: Event & { currentTarget: HTMLInputElement }) {
        query = event.currentTarget.value;
        open = true;
        activeIndex = -1;
        runSearch(query);
    }

    function pick(rec: AirportRecord) {
        value = toSegmentAirport(rec);
        onchange(value);
        searching = false;
        open = false;
        query = '';
        results = [];
        manual = false;
    }

    function startManual() {
        manual = true;
        open = false;
        manualName = query.trim();
        manualTz = '';
    }

    function applyManual() {
        const name = manualName.trim();
        if (!name) return;
        value = { name, city: name, tz: manualTz.trim() || undefined };
        onchange(value);
        searching = false;
        manual = false;
        query = '';
    }

    function clear() {
        value = undefined;
        onchange(undefined);
        searching = true;
        query = '';
        results = [];
        open = false;
    }

    function onKeydown(event: KeyboardEvent) {
        if (manual) return;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            open = true;
            activeIndex = Math.min(activeIndex + 1, results.length - 1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            if (activeIndex >= 0 && activeIndex < results.length) pick(results[activeIndex]);
            else if (results.length > 0) pick(results[0]);
            else startManual();
        } else if (event.key === 'Escape') {
            open = false;
        }
    }

    const activeDescendant = $derived(
        open && activeIndex >= 0 && activeIndex < results.length ? optId(activeIndex) : undefined
    );
</script>

{#if !showSearch}
    <!-- Selected airport chip with a Change affordance. -->
    <div
        class={cn(
            'flex items-center gap-2 rounded-md border bg-surface px-3 py-2 text-sm shadow-sm',
            invalid ? 'border-danger' : 'border-border'
        )}
    >
        <MapPin class="size-4 shrink-0 text-primary-700" />
        <span class="min-w-0 flex-1 truncate font-medium text-ink">{chipLabel}</span>
        {#if value?.tz}<span class="shrink-0 text-xs text-ink-muted">{value.tz}</span>{/if}
        <button
            type="button"
            onclick={clear}
            class="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-primary-700 hover:underline"
        >
            Change
        </button>
    </div>
{:else if manual}
    <!-- Manual entry: an unknown code + name + IANA timezone. -->
    <div class="flex flex-col gap-2 rounded-md border border-border bg-surface-sunken p-3">
        <input
            value={manualName}
            oninput={(e) => (manualName = e.currentTarget.value)}
            placeholder="Airport / place name"
            aria-label="Airport name"
            class="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/30"
        />
        <input
            value={manualTz}
            oninput={(e) => (manualTz = e.currentTarget.value)}
            placeholder="Timezone, e.g. Europe/Madrid"
            aria-label="Timezone (IANA)"
            class="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-ink focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/30"
        />
        <div class="flex items-center justify-between">
            <button
                type="button"
                onclick={() => (manual = false)}
                class="text-xs font-medium text-ink-muted hover:text-ink"
            >
                Back to search
            </button>
            <button
                type="button"
                onclick={applyManual}
                disabled={!manualName.trim()}
                class="inline-flex items-center gap-1 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50 [&_svg]:size-3.5"
            >
                <Check /> Use this
            </button>
        </div>
        <p class="text-[0.7rem] text-ink-muted">
            Times use this zone for duration and layover maths.
        </p>
    </div>
{:else}
    <div class="relative">
        <div class="relative">
            <Search
                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            />
            <input
                {id}
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={activeDescendant}
                aria-invalid={invalid || undefined}
                autocomplete="off"
                value={query}
                {placeholder}
                oninput={onInput}
                onkeydown={onKeydown}
                onfocus={() => (open = query.trim().length > 0)}
                class={cn(
                    'h-11 w-full rounded-md border bg-surface pl-9 pr-9 text-base text-ink shadow-sm transition-colors placeholder:text-ink-muted/60 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/30',
                    invalid ? 'border-danger' : 'border-border'
                )}
            />
            {#if value}
                <button
                    type="button"
                    onclick={clear}
                    aria-label="Clear airport"
                    class="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-ink [&_svg]:size-4"
                >
                    <X />
                </button>
            {/if}
        </div>

        {#if open}
            <ul
                id={listId}
                role="listbox"
                aria-label="Airport results"
                class="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-card"
            >
                {#each results as rec, i (rec.code)}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <li
                        id={optId(i)}
                        role="option"
                        aria-selected={activeIndex === i}
                        onmousedown={(e) => e.preventDefault()}
                        onclick={() => pick(rec)}
                        onmouseover={() => (activeIndex = i)}
                        class={cn(
                            'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm',
                            activeIndex === i
                                ? 'bg-primary-100 text-primary-700'
                                : 'text-ink hover:bg-surface-sunken'
                        )}
                    >
                        <span class="grid w-10 shrink-0 place-items-center rounded bg-surface-sunken py-0.5 text-xs font-semibold tabular-nums">
                            {rec.code}
                        </span>
                        <span class="min-w-0 flex-1">
                            <span class="block truncate font-medium">{rec.city}</span>
                            <span class="block truncate text-xs text-ink-muted">{rec.name} · {rec.country}</span>
                        </span>
                    </li>
                {:else}
                    <li class="px-2.5 py-2 text-sm text-ink-muted">No matches.</li>
                {/each}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <li
                    role="option"
                    aria-selected={false}
                    onmousedown={(e) => e.preventDefault()}
                    onclick={startManual}
                    class="mt-1 flex cursor-pointer items-center gap-2 rounded-md border-t border-border px-2.5 py-2 text-sm text-primary-700 hover:bg-surface-sunken [&_svg]:size-4"
                >
                    <PencilLine /> Enter manually.
                </li>
            </ul>
        {/if}
    </div>
{/if}