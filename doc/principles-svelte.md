# Svelte 5 Development Guide

This guide covers common patterns, gotchas, and best practices for Svelte 5 development, especially when working with third-party libraries like Melt UI.

## Table of Contents

## Svelte 5 Key Changes

### Runes Replace Reactive Declarations

```svelte
<!-- Svelte 4 -->
<script>
  let count = 0;
  $: doubled = count * 2;
</script>

<!-- Svelte 5 -->
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

### Event Handlers Changed

```svelte
<!-- Svelte 4 -->
<button on:click={handleClick}>Click me</button>

<!-- Svelte 5 -->
<button onclick={handleClick}>Click me</button>
```

### Props Destructuring

```svelte
<!-- Svelte 4 -->
<script>
  export let title;
  export let items = [];
</script>

<!-- Svelte 5 -->
<script>
  let { title, items = [] } = $props();
</script>
```

## Runes and State Management

### $state() for Reactive Variables

```svelte
<script>
	// Simple state
	let count = $state(0);

	// Complex state (objects/arrays)
	let user = $state({
		name: 'John',
		email: 'john@example.com'
	});

	let todos = $state([{ id: 1, text: 'Learn Svelte 5', done: false }]);
</script>
```

### $derived() for Computed Values

```svelte
<script>
	let items = $state([1, 2, 3, 4, 5]);

	// Simple derived value
	let total = $derived(items.length);

	// Complex derived value
	let summary = $derived({
		count: items.length,
		sum: items.reduce((a, b) => a + b, 0),
		average: items.length > 0 ? items.reduce((a, b) => a + b, 0) / items.length : 0
	});
</script>
```

### $effect() for Side Effects

```svelte
<script>
	let count = $state(0);

	// Basic effect
	$effect(() => {
		console.log('Count changed:', count);
	});

	// Effect with cleanup
	$effect(() => {
		const interval = setInterval(() => {
			count++;
		}, 1000);

		return () => clearInterval(interval);
	});

	// Effect that runs only once (like onMount)
	$effect(() => {
		console.log('Component mounted');
		// No dependencies, runs once
	});
</script>
```

### Accessing Store Values in Svelte 5

How you get a store's value depends on the context.

#### 1. In the Template (`<template>`)

Use the classic `$store` prefix. This creates a reactive subscription.

```svelte
<script>
  import { countStore } from './stores';
</script>

<p>The count is: {$countStore}</p>
```

2. In the Script `<script>` - Top Level
You can use the $store prefix for top-level variables. This creates a reactive variable that updates whenever the store changes.
```
<script>
  import { get } from 'svelte/store';
  import { countStore } from './stores';

  function logCurrentCount() {
    // ✅ CORRECT: Use get() for a one-time value read inside a function
    const currentValue = get(countStore);
    console.log('The count right now is:', currentValue);
  }

  // ❌ WRONG: This will cause a compiler error
  // function broken() {
  //   console.log($countStore);
  // }
</script>
```

3. In the Script (`<script>`) - Inside Functions or Loops
You cannot use the $store prefix here. For one-time (non-reactive) reads, use the get() function.
```
<script>
  import { get } from 'svelte/store';
  import { countStore } from './stores';

  function logCurrentCount() {
    // ✅ CORRECT: Use get() for a one-time value read inside a function
    const currentValue = get(countStore);
    console.log('The count right now is:', currentValue);
  }

  // ❌ WRONG: This will cause a compiler error
  // function broken() {
  //   console.log($countStore);
  // }
</script>
```


### Store Subscription Gotchas

#### ❌ Invalid Store Subscriptions

```svelte
<!-- WRONG: Cannot subscribe to dynamically created stores -->
<script>
	let dynamicStore = $state(writable(0));
</script>

<!-- WRONG: Cannot subscribe to stores inside loops -->
{#each items as item}
	<div>{$item.store}</div>
	<!-- Error! -->
{/each}
<div>{$dynamicStore}</div>
<!-- Error! -->

<!-- WRONG: Cannot subscribe to stores in nested objects -->
{#each projects as project}
	<div class={$project.collapsible.open ? 'open' : 'closed'}>
		<!-- Error: store_invalid_scoped_subscription -->
	</div>
{/each}
```

#### ✅ Correct Store Usage

```svelte
<script>
	// Stores must be declared at component top level
	import { writable } from 'svelte/store';

	const globalStore = writable(0);

	let items = $state([
		{ id: 1, value: 10, open: false }, // Use regular state
		{ id: 2, value: 20, open: true }
	]);

	// Sync external library state with local state
	$effect(() => {
		items.forEach((item) => {
			if (!item.collapsible) {
				const { elements, states } = createCollapsible({
					onOpenChange: ({ next }) => {
						item.open = next; // Sync to local state
						return next;
					}
				});
				item.collapsible = elements;
			}
		});
	});
</script>

<!-- Correct store subscription -->
<div>Global value: {$globalStore}</div>

<!-- Use regular state for dynamic content -->
{#each items as item}
	<div class={item.open ? 'open' : 'closed'}>
		{item.value}
	</div>
{/each}
```

## Common Gotchas and Solutions

### 1. Event Handler Binding

```svelte
<script>
	let items = $state(['a', 'b', 'c']);

	function handleClick(item, event) {
		console.log('Clicked:', item);
	}
</script>

<!-- ❌ WRONG: This won't work as expected -->
{#each items as item}
	<button onclick={handleClick(item)}>Click</button>
{/each}

<!-- ✅ CORRECT: Use arrow function -->
{#each items as item}
	<button onclick={(e) => handleClick(item, e)}>Click</button>
{/each}
```

### 2. Conditional Rendering with Actions

```svelte
<script>
	import { createTooltip } from '@melt-ui/svelte';

	let showTooltip = $state(true);

	const {
		elements: { trigger, content }
	} = createTooltip();
</script>

<!-- ❌ WRONG: Action applied conditionally can cause issues -->
{#if showTooltip}
	<button use:trigger>Hover me</button>
{/if}

<!-- ✅ CORRECT: Keep element, conditionally show content -->
<button use:trigger>
	Hover me
	{#if showTooltip}
		<span use:content>Tooltip content</span>
	{/if}
</button>
```

### 3. State Mutation Patterns

```svelte
<script>
	let todos = $state([{ id: 1, text: 'Task 1', done: false }]);

	function addTodo(text) {
		// ✅ CORRECT: Create new array
		todos = [...todos, { id: Date.now(), text, done: false }];

		// ❌ WRONG: Direct mutation (won't trigger reactivity)
		// todos.push({ id: Date.now(), text, done: false });
	}

	function toggleTodo(id) {
		// ✅ CORRECT: Find and mutate object property
		const todo = todos.find((t) => t.id === id);
		if (todo) {
			todo.done = !todo.done; // This works in Svelte 5
		}

		// Alternative: Create new array with updated object
		// todos = todos.map(t =>
		//   t.id === id ? { ...t, done: !t.done } : t
		// );
	}
</script>
```

### 4. Component Communication

```svelte
<!-- Parent.svelte -->
<script>
  import Child from './Child.svelte';

  let childData = $state('');

  function handleChildEvent(data) {
    childData = data;
  }
</script>

<!-- ✅ CORRECT: Use callback props instead of events -->
<Child onDataChange={handleChildEvent} />
<p>Child data: {childData}</p>

<!-- Child.svelte -->
<script>
  let { onDataChange } = $props();

  let inputValue = $state('');

  function handleInput() {
    onDataChange?.(inputValue);
  }
</script>

<input bind:value={inputValue} oninput={handleInput} />
```

## Migration Patterns

### From Svelte 4 Stores to Svelte 5 State

```svelte
<!-- Svelte 4 -->
<script>
  import { writable, derived } from 'svelte/store';

  const count = writable(0);
  const doubled = derived(count, $count => $count * 2);

  function increment() {
    count.update(n => n + 1);
  }
</script>

<button on:click={increment}>Count: {$count}</button>
<p>Doubled: {$doubled}</p>

<!-- Svelte 5 -->
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);

  function increment() {
    count++;
  }
</script>

<button onclick={increment}>Count: {count}</button>
<p>Doubled: {doubled}</p>
```

### From createEventDispatcher to Callback Props

```svelte
<!-- Svelte 4 -->
<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch('customEvent', { data: 'hello' });
  }
</script>

<button on:click={handleClick}>Click me</button>

<!-- Svelte 5 -->
<script>
  let { onCustomEvent } = $props();

  function handleClick() {
    onCustomEvent?.({ data: 'hello' });
  }
</script>

<button onclick={handleClick}>Click me</button>
```

## Real-World Debugging Examples

#### Problem: Content Not Hiding/Showing

```svelte
<!-- ❌ WRONG: Using action without conditional rendering -->
<div use:content>
	<p>This content never hides!</p>
</div>

<!-- ✅ CORRECT: Combine action with conditional rendering -->
<div use:content>
	{#if $open}
		<p>This content shows/hides properly!</p>
	{/if}
</div>

<!-- ✅ ALTERNATIVE: Use local state to avoid store subscription issues -->
<div use:content>
	{#if localOpenState}
		<p>Using synced local state!</p>
	{/if}
</div>
```

#### Problem: Store Subscription in Loops

```svelte
<!-- ✅ CORRECT: Use local state synced with onOpenChange -->
<script>
	$effect(() => {
		projects.forEach((project) => {
			if (!project.collapsible) {
				const { elements, states } = createCollapsible({
					onOpenChange: ({ next }) => {
						project.open = next; // Sync to local state
						return next;
					}
				});
				project.collapsible = elements;
			}
		});
	});
</script>

<!-- ❌ WRONG: Cannot subscribe to stores in loops -->
{#each projects as project}
	<div class={$project.collapsible.open ? 'open' : 'closed'}>
		<!-- Error: store_invalid_scoped_subscription -->
	</div>
{/each}

{#each projects as project}
	<div class={project.open ? 'open' : 'closed'}>
		<!-- Uses local state, no store subscription -->
	</div>
{/each}
```

### Complete Working Example: Todo App with Collapsible Projects

```svelte
<script lang="ts">
	import { createCollapsible } from '@melt-ui/svelte';
	import { ChevronRight } from 'lucide-svelte';

	interface Project {
		id: string;
		name: string;
		tasks: string[];
		open: boolean;
		collapsible?: {
			trigger: any;
			content: any;
		};
	}

	let projects = $state<Project[]>([
		{ id: '1', name: 'Work', tasks: ['Task 1', 'Task 2'], open: true },
		{ id: '2', name: 'Personal', tasks: ['Task 3'], open: false }
	]);

	// Initialize collapsibles
	$effect(() => {
		projects.forEach((project) => {
			if (!project.collapsible) {
				const {
					elements: { trigger, content },
					states: { open }
				} = createCollapsible({
					defaultOpen: project.open,
					onOpenChange: ({ next }) => {
						project.open = next; // Sync local state
						return next;
					}
				});

				project.collapsible = { trigger, content };
			}
		});
	});
</script>

{#each projects as project}
	{#if project.collapsible}
		<div class="rounded border">
			<!-- Header with trigger -->
			<button use:project.collapsible.trigger class="flex w-full items-center gap-2 p-4">
				<ChevronRight class="h-4 w-4 transition-transform {project.open ? 'rotate-90' : ''}" />
				{project.name}
			</button>

			<!-- Collapsible content -->
			<div use:project.collapsible.content>
				{#if project.open}
					<div class="border-t p-4">
						{#each project.tasks as task}
							<div class="py-1">{task}</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
{/each}
```






### Debugging Tips

#### Add Comprehensive Logging

```svelte
<script>
	import { createCollapsible } from '@melt-ui/svelte';

	console.log('🔧 Creating collapsible...');

	const collapsibleResult = createCollapsible({
		defaultOpen: false,
		onOpenChange: ({ next }) => {
			console.log('🔄 State change:', { next });
			return next;
		}
	});

	console.log('🔍 Collapsible result:', collapsibleResult);
	console.log('🔍 Available keys:', Object.keys(collapsibleResult));

	const {
		elements: { trigger, content },
		states: { open }
	} = collapsibleResult;

	console.log('✅ Elements extracted:', {
		hasTrigger: !!trigger,
		hasContent: !!content,
		triggerType: typeof trigger,
		contentType: typeof content
	});
</script>
```

#### Check Library Versions

Always verify you're using compatible versions:

```json
{
	"dependencies": {
		"svelte": "^5.0.0",
		"@melt-ui/svelte": "^0.86.6"
	}
}
```

#### Test Simple Cases First

Create isolated examples to verify library integration:

```svelte
<!-- SimpleTest.svelte -->
<script>
	import { createCollapsible } from '@melt-ui/svelte';

	const {
		elements: { trigger, content },
		states: { open }
	} = createCollapsible();
</script>

<button use:trigger>Toggle</button>
<div use:content>
	{#if $open}
		<p>It works!</p>
	{/if}
</div>
```

## Best Practices Summary

1. **Always destructure Melt UI returns**: `const { elements: { trigger, content }, states: { open } } = createCollapsible()`
2. **Check API structure first**: Log `Object.keys(result)` to verify the structure
3. **Use $state() for reactive data**: Replace `let` with `let variable = $state(initialValue)`
4. **Use $derived() for computed values**: Replace `$:` with `let computed = $derived(expression)`
5. **Use callback props instead of events**: Replace `createEventDispatcher` with prop functions
6. **Avoid store subscriptions in loops**: Use regular state management and sync with `onOpenChange`
7. **Sync external library state with local state**: Use callbacks to keep states in sync
8. **Debug with comprehensive logging**: Log library returns, types, and state changes
9. **Test simple cases first**: Create isolated examples to verify library integration
10. **Always check library versions**: Ensure compatibility between Svelte 5 and third-party libraries

## Version-Specific Notes

### Melt UI v0.86.6+ Breaking Changes

- **API Structure Changed**: Returns `{elements, states, options}` instead of direct properties
- **Always Destructure**: Must destructure `elements` and `states` objects
- **Check Documentation**: API may continue evolving, always verify current structure

### Svelte 5 Store Limitations

- **No Scoped Subscriptions**: Cannot use `$store` inside loops or conditional blocks
- **Top-Level Only**: Store subscriptions must be at component top level
- **Use Local State**: Prefer `$state()` and sync with external libraries via callbacks

This guide should help avoid common pitfalls when working with Svelte 5 and third-party libraries!


