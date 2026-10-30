// A host app with its own root component and its own Pinia. TOGGLE shows twice
// from the published @hackbuild/bench build: region "mount" has a child call
// createBench(...).mount(el) in onMounted, region "view" renders
// <BenchView :bench="controller" />. Each region has its own controller and
// its own Pinia. BENCH stays off globalThis (hook default off); the
// controllers are on window.hbfHost for the smoke spec.
import { createPinia } from "pinia";
import { createApp, defineComponent, h, onBeforeUnmount, onMounted, ref } from "vue";
import { BenchView, createBench, pageBench, pageOf } from "@hackbuild/bench";
import "@hackbuild/bench/style.css";
import "@virgilvox/hackbuild-ui/styles.css";
import { bench, chase, contact } from "./design.js";
import { meta } from "./design-meta.js";

const host = { mount: null, view: null };
globalThis.hbfHost = host;

const make = () => createBench({ chase, bench, contact, ...pageBench(pageOf(meta.globals.page)), globals: true });

/** Region one: the child owns the mount element and mounts in onMounted. */
const MountRegion = defineComponent({
  name: "MountRegion",
  setup() {
    const el = ref(null);
    const controller = make();
    host.mount = controller;
    onMounted(() => controller.mount(el.value));
    onBeforeUnmount(() => controller.unmount());
    return () => h("div", { id: "region-mount", class: "region", ref: el });
  },
});

/** Region two: the host renders the view inside its own tree. */
const ViewRegion = defineComponent({
  name: "ViewRegion",
  setup() {
    const controller = make();
    host.view = controller;
    onBeforeUnmount(() => controller.unmount());
    return () => h("div", { id: "region-view", class: "region" }, [h(BenchView, { bench: controller })]);
  },
});

const App = defineComponent({
  name: "HostApp",
  setup: () => () => h("main", { class: "hb" }, [h("h1", "vue host"), h(MountRegion), h(ViewRegion)]),
});

createApp(App).use(createPinia()).mount("#root");
