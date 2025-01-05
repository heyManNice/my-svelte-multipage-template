import Index from './Index.svelte';

export default new Index({
	target: document.body,
	props: {
		name: 'world'
	}
});