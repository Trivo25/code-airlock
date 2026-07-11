// Code Airlock landing page interactions. No dependencies.
document.documentElement.classList.add("js");

let reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

// mobile nav
let navToggle = document.querySelector(".nav-toggle");
let navMenu = document.getElementById("nav-menu");
navToggle.addEventListener("click", () => {
  let open = navMenu.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(open));
});
navMenu.addEventListener("click", (e) => {
  if (e.target.closest("a")) {
    navMenu.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

// copy buttons with data-copy payloads
function flashCopied(btn) {
  btn.classList.add("copied");
  let label = btn.querySelector("span");
  let prev = label ? label.textContent : null;
  if (label) label.textContent = "Copied";
  setTimeout(() => {
    btn.classList.remove("copied");
    if (label) label.textContent = prev;
  }, 1600);
}

for (let btn of document.querySelectorAll(".copy-btn[data-copy]")) {
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      flashCopied(btn);
    } catch {
      /* clipboard unavailable (permissions, http) */
    }
  });
}

// terminal tabs
let tabs = Array.from(document.querySelectorAll('.term-tabs [role="tab"]'));
let panels = tabs.map((tab) =>
  document.getElementById(tab.getAttribute("aria-controls")),
);

function selectTab(tab) {
  for (let i = 0; i < tabs.length; i++) {
    let selected = tabs[i] === tab;
    tabs[i].setAttribute("aria-selected", String(selected));
    tabs[i].tabIndex = selected ? 0 : -1;
    panels[i].hidden = !selected;
  }
}

for (let tab of tabs) {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (e) => {
    let i = tabs.indexOf(tab);
    let next = null;
    if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
    if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
    if (e.key === "Home") next = tabs[0];
    if (e.key === "End") next = tabs[tabs.length - 1];
    if (next) {
      e.preventDefault();
      next.focus();
      selectTab(next);
    }
  });
}

// terminal copy: active panel's commands, prompts stripped, comments kept
let termCopy = document.querySelector(".term-copy");
termCopy.addEventListener("click", async () => {
  let panel = panels.find((p) => !p.hidden);
  let text = panel
    .querySelector("code")
    .textContent.split("\n")
    .map((line) => line.replace(/^\$ /, ""))
    .join("\n")
    .trim();
  try {
    await navigator.clipboard.writeText(text);
    flashCopied(termCopy);
  } catch {
    /* clipboard unavailable */
  }
});

// GitHub star count; hidden unless the fetch succeeds
(async () => {
  try {
    let res = await fetch("https://api.github.com/repos/Trivo25/code-airlock");
    if (!res.ok) return;
    let data = await res.json();
    let n = data.stargazers_count;
    if (typeof n !== "number" || n < 1) return;
    let label =
      n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
    for (let el of document.querySelectorAll(".star-count, .star-num")) {
      el.textContent = label;
      el.hidden = false;
    }
  } catch {
    /* offline or rate-limited: keep the count hidden */
  }
})();

// entrance reveals
if (!reducedMotion && "IntersectionObserver" in window) {
  let io = new IntersectionObserver(
    (entries) => {
      for (let entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: "0px 0px -5% 0px" },
  );
  for (let el of document.querySelectorAll(".reveal")) io.observe(el);
} else {
  for (let el of document.querySelectorAll(".reveal")) el.classList.add("in");
}

// hero flow diagram sequencer
// The markup defaults to the completed state so no-JS and reduced-motion
// visitors see the full picture. With motion allowed, strip it back and loop.
let diagram = document.getElementById("flow-diagram");
if (diagram && !reducedMotion) {
  let stepped = Array.from(
    diagram.querySelectorAll('[data-step]:not([data-step="0"])'),
  );
  let checkpoints = Array.from(diagram.querySelectorAll(".checkpoint"));
  let vmState = document.getElementById("vm-state");
  let timers = [];

  function at(ms, fn) {
    timers.push(setTimeout(fn, ms));
  }
  function show(step) {
    for (let el of stepped) {
      if (el.dataset.step === String(step)) el.classList.add("on");
    }
  }
  function reset() {
    for (let el of stepped) el.classList.remove("on");
    for (let cp of checkpoints) cp.classList.remove("passed");
    diagram.classList.remove("merged");
    vmState.textContent = "starting";
    vmState.className = "state state-starting";
  }

  function run() {
    reset();
    at(500, () => show(1)); // sandbox starts
    at(1600, () => show(2)); // private clone created
    at(2400, () => {
      vmState.textContent = "running";
      vmState.className = "state state-running";
    });
    at(3000, () => show(3)); // agent works
    at(4600, () => show(4)); // commits appear
    at(6200, () => show(5)); // commits reach the airlock
    at(6900, () => checkpoints[0].classList.add("passed"));
    at(7500, () => checkpoints[1].classList.add("passed"));
    at(8100, () => checkpoints[2].classList.add("passed"));
    at(9000, () => {
      // merge stays under developer control
      show(6);
      checkpoints[3].classList.add("passed");
      diagram.classList.add("merged");
    });
    at(13000, () => run()); // hold, then loop
  }

  // start animating once the diagram is on screen
  diagram.classList.add("anim");
  let started = false;
  let watcher = new IntersectionObserver(
    (entries) => {
      if (!started && entries.some((e) => e.isIntersecting)) {
        started = true;
        watcher.disconnect();
        run();
      }
    },
    { threshold: 0.3 },
  );
  watcher.observe(diagram);
}

// demo video: no autoplay under reduced motion; controls stay available
let demoVideo = document.querySelector(".demo-frame video");
if (demoVideo && reducedMotion) {
  demoVideo.removeAttribute("autoplay");
  demoVideo.removeAttribute("loop");
  demoVideo.pause();
  demoVideo.addEventListener(
    "loadeddata",
    () => demoVideo.paused || demoVideo.pause(),
    { once: true },
  );
}

// teams pilot form: submit to Formspree; without JS the form POSTs natively
let teamsForm = document.getElementById("teams-form");
if (teamsForm) {
  teamsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    let btn = teamsForm.querySelector('button[type="submit"]');
    let hint = teamsForm.querySelector(".form-hint");
    let f = new FormData(teamsForm);
    f.set("agents", f.getAll("agents").join(", ") || "none listed");
    btn.disabled = true;
    btn.textContent = "Sending...";
    try {
      let res = await fetch(teamsForm.action, {
        method: "POST",
        body: f,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(String(res.status));
      teamsForm.innerHTML =
        '<p class="form-success">Request received. We will follow up at the address you provided.</p>';
    } catch {
      btn.disabled = false;
      btn.textContent = "Request pilot access";
      hint.textContent =
        "Sending failed. Please retry, or email florian@technotro.com directly.";
      hint.classList.add("form-error");
    }
  });
}
