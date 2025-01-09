<script>
    import Hello from "../../components/Hello.svelte";
	import {alertTest} from "../../modules/utils"
	export let name;
    let counter = 0;
    setInterval(() => {
        counter++;
    }, 1000);
</script>

<main>
	<h1>Hello {name} time:08:{counter<10?'0'+counter:counter}!</h1>
	<p>Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn how to build Svelte apps.</p>
    <p><a href="/about.html">Here</a> to a about page</p>
	<button on:click={alertTest}>alert</button>
	<img width="200px" src="assets/images/ok.png" alt="test">
    <Hello/>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>