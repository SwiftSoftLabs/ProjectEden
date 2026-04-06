# **Project Eden: Architectural Blueprint and Technical Specification for a High-Fidelity Luxury Botanical Interface**

## **1\. Executive Summary and Strategic Vision**

### **1.1 The Mandate: Redefining Digital Horticulture**

The digital horticulture market is currently saturated with utilitarian applications that prioritize function over form. These existing solutions—focused primarily on identification algorithms and basic scheduling—fail to address the psychographic needs of the ultra-high-net-worth individual (UHNWI). For the billionaire plant enthusiast, the value of an application lies not in its ability to remind, but in its ability to delight. The mandate for "Project Eden" is to construct a mobile-responsive web application that serves as a digital extension of a physical luxury estate. It must function less like a tool and more like a gallery, offering an "award-winning" user experience defined by ultra-high-fidelity 3D assets, fluid transitions, and a tactile interface that mimics the weight and responsiveness of physical luxury goods.

The core objective is to leverage the **Tempo** platform to accelerate the development of a React-based Single Page Application (SPA), integrated with a high-performance **React Three Fiber (R3F)** rendering engine. This hybrid approach allows for rapid UI iteration via Tempo’s visual interface while maintaining the granular control over the WebGL pipeline necessary to achieve the "engineering marvel" aesthetic requested. The application will feature a bespoke onboarding flow, a procedurally animated "infinite garden" home screen, and a scientifically rigorous growth simulation engine that visualizes the care status of ten exclusive botanical specimens through thirty distinct stages of development.

### **1.2 Defining the "Luxury" User Experience**

To achieve the requested "award-winning" status—comparable to the immersive web experiences recognized by Awwwards or the FWA—Project Eden must adhere to strict experiential pillars. Analysis of 2024-2025 design trends indicates that luxury in the digital space is characterized by "invisible technology" and "visceral physics".1

First, the interface must exhibit **Newtonian continuity**. Elements should not simply appear or disappear; they must transition with inertia and damping, simulating the resistance of a heavy mechanical switch or the glide of a soft-close drawer.3 This requires the implementation of custom Bézier curves and spring-physics animations (using libraries like react-spring or framer-motion) rather than standard linear interpolations.

Second, the visual fidelity must be uncompromising. The target demographic is accustomed to perfection. Therefore, the 3D plant models must utilize Physically Based Rendering (PBR) workflows that simulate the interaction of light with organic matter—subsurface scattering for translucent leaves, clear-coat sheen for waxy cuticles, and anisotropic filtering for detailed textures.4 The rendering pipeline must support High Dynamic Range (HDR) lighting to ground the digital assets in a realistic environment, avoiding the "flat" look common in lower-tier applications.

### **1.3 The Tempo Implementation Strategy**

The selection of **Tempo** as the development environment provides a critical strategic advantage. By utilizing Tempo’s "Agent+" service and visual editor, the development team can decouple the construction of the 2D user interface (HUD, menus, onboarding overlays) from the complex 3D engineering.6 Tempo’s ability to generate production-ready React code and sync directly with GitHub allows for a dual-track workflow: AI agents and visual designers can iterate on the UI layout and responsiveness in real-time, while specialized graphics engineers focus on the R3F scene graph and shader logic.8 This ensures that the application remains lightweight and performant—a key requirement for a "smooth" experience—while delivering the heavy visual payload of the 3D garden.

## ---

**2\. Technical Architecture and Stack Specification**

### **2.1 Core Framework**

The application will be architected as a progressive web application (PWA) to ensure near-native performance on mobile devices without the friction of app store downloads.

* **Runtime:** **React 18+**. The concurrent rendering features of React 18 are essential for prioritizing user interactions (swipes, taps) over heavy 3D rendering tasks, preventing frame drops during complex animations.6  
* **Language:** **TypeScript**. Strict typing is non-negotiable to ensure the reliability of the complex state logic governing plant growth and gamification streaks.  
* **Build System:** **Vite**. Pre-configured by Tempo, Vite offers the Hot Module Replacement (HMR) speeds necessary for fine-tuning shaders and animation curves in real-time.11  
* **Styling:** **Tailwind CSS**. Tempo’s visual editor natively integrates with Tailwind, allowing for rapid styling of the 2D overlay elements with a "utility-first" approach that keeps the CSS bundle size minimal.8

### **2.2 The 3D Rendering Engine**

The "engineering marvel" aspect of Project Eden relies entirely on the WebGL pipeline. We will utilize the **React Three Fiber (R3F)** ecosystem, which provides a declarative bridge between React's state management and the imperative Three.js library.

* **Core Library:** @react-three/fiber manages the canvas and render loop. It allows us to express the 3D scene graph as React components (\<Mesh\>, \<Light\>), making the "garden" state easy to manipulate.4  
* **Asset Management:** @react-three/drei will be used for its optimized useGLTF loaders (with Draco compression support) and Environment components, which are crucial for realistic lighting.12  
* **Post-Processing:** To achieve the "cinematic" look, we will implement @react-three/postprocessing. This pipeline will include:  
  * **Bloom:** A subtle, threshold-gated bloom to make healthy, well-watered leaves appear to glow slightly under the virtual "sun."  
  * **Depth of Field (DoF):** Dynamic bokeh effects that focus on the selected plant while blurring the background garden, mimicking the aperture of a high-end portrait lens.13  
  * **Noise:** A imperceptible film grain to dither color banding and add a tactile, analog warmth to the digital image.14

### **2.3 State Management and Data Persistence**

The complexity of tracking thirty growth stages across ten distinct plants, combined with a "streak" system and historical watering data, requires a robust state management solution.

* **Global State:** **Zustand**. Chosen for its transient update capabilities. Unlike React Context, Zustand allows us to update the 3D scene (e.g., growing a plant frame-by-frame) without triggering re-renders of the entire 2D UI tree, which is critical for maintaining 60fps.10  
* **Persistence:** **Supabase**. As a luxury app, user data must be synced across devices (e.g., from an iPhone to an iPad Pro). Supabase provides a scalable PostgreSQL backend with real-time subscriptions, allowing the app to instantly reflect watering events across all user sessions.7  
* **Asset Delivery:** **AWS CloudFront or Cloudflare R2**. The high-fidelity 3D models (GLB files) will be substantial in size. A global Content Delivery Network (CDN) is required to ensure that a billionaire user in the Maldives experiences the same load times as one in Manhattan.15

## ---

**3\. The 3D Asset Pipeline: The "30 Stages" of Growth**

The requirement to display ten distinct plant species, each with thirty variations of growth, presents a significant technical challenge. Generating three hundred unique, high-poly 3D models and loading them into a mobile browser would result in unacceptable memory usage and load times. Therefore, Project Eden will utilize a **Hybrid AI-Procedural Pipeline** to generate "Keyframe Assets" and mathematically interpolate between them.

### **3.1 Plant Selection: The "Billionaire's Greenhouse"**

The selection of plants must reflect current trends in high-value horticulture. We will focus on specimens that are rare, architectural, or historically significant.16

| Specimen ID | Botanical Name | Common Name | "Luxury" Aesthetic Value |
| :---- | :---- | :---- | :---- |
| **001** | *Monstera deliciosa 'Albo Variegata'* | Variegated Monstera | The quintessential status symbol; distinct white/green marbling. |
| **002** | *Philodendron spiritus sancti* | Spirit of the Holy Ghost | Extremely rare, endangered, and highly coveted ($10k+ value). |
| **003** | *Ficus lyrata* | Fiddle Leaf Fig | Architectural staple; requires precise care and environment. |
| **004** | *Monstera obliqua Peru* | Obliqua | Known for extreme fenestration (more hole than leaf); delicate. |
| **005** | *Philodendron erubescens* | Pink Princess | High-contrast black and pink foliage; striking visual UI element. |
| **006** | *Musa aeae* | Variegated Banana | Massive, architectural leaves; dynamic movement in wind. |
| **007** | *Anthurium warocqueanum* | Queen Anthurium | Velvet-leaf texture requiring advanced shader (sheen/roughness). |
| **008** | *Agave titanota* | Titanota | Geometric perfection; structural and minimalist. |
| **009** | *Zamioculcas zamiifolia 'Raven'* | Raven ZZ | Jet black foliage; offers high contrast in bright UI modes.18 |
| **010** | *Juniperus chinensis* | Shimpaku Bonsai | Symbol of patience, cultivation, and time. |

### **3.2 AI-Driven Generation Strategy**

We will employ **Meshy AI** or **Tripo 3D** to generate the geometry for these plants. These platforms offer APIs capable of generating textured 3D meshes from natural language prompts.19

**Step 1: Keyframe Generation.**

Instead of generating 30 models per plant, we will generate **5 Key Stages**: Seedling (Stage 1), Sapling (Stage 7), Juvenile (Stage 15), Adolescent (Stage 22), and Mature (Stage 30).

* *Prompt Engineering:* The prompts sent to the AI agent must be specific regarding morphology.  
  * *Example Prompt (Mature):* "Photorealistic Monstera Albo plant, large fenestrated leaves with white variegation, moss pole support, high detail, PBR texture."  
  * *Example Prompt (Seedling):* "Small Monstera Albo sprout, two unfurled leaves, soil base, minimal potting."

**Step 2: Topology Standardization.** Raw AI outputs often have messy topology (triangles). To enable smooth animation between stages, the topology must be consistent. We will utilize a semi-automated pipeline (potentially coordinated via Tempo's Agent+) where the AI-generated .obj files are passed through a retopology script (e.g., using Blender's Python API) to ensure consistent vertex counts and edge loops.22

### **3.3 The "Morph Target" Interpolation Technique**

To achieve the "30 variations" requirement without the data weight, we will use **Morph Targets** (also known as Shape Keys).23

* **Mechanism:** The "Sapling" model will be set as a morph target of the "Seedling" model. In the R3F scene, as the user waters the plant, we will increment the morphTargetInfluence from 0.0 to 1.0.  
* **Result:** This creates a perfectly smooth, continuous growth animation. Stage 1.5, Stage 1.6, etc., are mathematically calculated by the GPU in real-time. This effectively creates infinite variations between the 5 keyframes, far exceeding the requested 30 while using only 20% of the asset memory.  
* **Procedural Detail:** For finer details, such as the unfurling of a new leaf, we will employ a custom **Vertex Shader**. This shader will manipulate the vertex positions of specific leaves based on a growth uniform, curling them tightly when the value is low and flattening them as it increases.14

## ---

**4\. User Experience Design: The "Award-Winning" Flow**

The user experience is designed to be a ritual. Every interaction must reinforce the premium nature of the application.

### **4.1 Onboarding: The "Initiation" Sequence**

The onboarding flow is a choreographed three-step sequence designed to teach the user the core interactions (Add, Select, Water) through "learning by doing."

**Visual Style:** The scene opens in "Void Mode"—a pitch-black environment with a single, dramatic spotlight illuminating a marble pedestal.

**Step 1: Acquisition (Adding a Plant)**

* *The Prompt:* Text fades in using a serif typeface (e.g., *Ogg* or *Editorial New*): *"Begin your collection."*  
* *The Interaction:* A glowing, pulsating "+" button floats above the empty pedestal.  
* *The Action:* The user presses the button. It does not just click; it compresses physically (scale animation) and emits a haptic "thud".27  
* *The Result:* The camera swoops down, and the first plant (e.g., the Bonsai) materializes on the pedestal using a "dissolve" shader effect—particles coalescing into solid matter.28

**Step 2: Curation (Selecting a Plant)**

* *The Prompt:* *"Navigate your sanctuary."*  
* *The Interaction:* The single plant is joined by ghosted outlines of others. A "List" icon (represented by a stylized 3D index card) pulses.  
* *The Action:* Tapping the icon triggers a camera transition. The view pulls back to reveal the "Carousel View"—the plants arranged in a semi-circle.  
* *The Result:* The user swipes to rotate the carousel. The plant in the center snaps into focus (DoF sharpens), while the others blur. The user taps the center plant to confirm selection.

**Step 3: Nurture (The First Watering)**

* *The Prompt:* *"Sustain life."*  
* *The Interaction:* A "Water" button appears at the bottom center. It is liquid-like, with a shader that mimics water surface tension.  
* *The Action:* The user must **hold** the button (not tap). As they hold, a stream of water particles (R3F particle system) pours from the top of the screen onto the plant.29  
* *The Payoff:* As the water hits the soil, the plant instantly animates from Stage 1 to Stage 2\. The leaves unfurl, the color saturates, and a "growth aura" (subtle bloom pulse) emits from the plant. This conditions the user: *Action \= Beauty*.30

### **4.2 The Home Screen: The "Infinite Garden"**

This is the application's dashboard, replacing the traditional list view with an immersive 3D environment.

* **Concept:** A linear, horizontal "Long Gallery."  
* **Technology:** ScrollControls from @react-three/drei.32 This component maps the browser's native scroll bar to the 3D camera's position along a pre-defined spline path.  
* **Interaction Design:**  
  * **Inertia:** The scroll must feel heavy. We will use maath.easing.damp to apply friction to the camera movement. A quick flick should send the camera gliding past multiple plants before slowly coming to a soft stop.8  
  * **Parallax:** The background (an abstract architectural space or blurred greenhouse) will move at 10% of the speed of the foreground plants, creating a deep sense of 3D space.  
  * **Selectability:** Tapping any plant in the gallery triggers an "Inspection" transition. The camera smoothly zooms in to frame the plant, the background dims, and the UI overlay shifts from "Gallery Mode" to "Care Mode".13

### **4.3 The Watering Streak: "Legacy"**

For the ultra-wealthy, "points" are trivial. The gamification must be framed as "Legacy" or "Estate Value."

* **The "Life Line":** Instead of a fire icon or a number, the streak is visualized as a golden thread or root system that connects the plants in the Infinite Garden.  
* **Growth:** As the user maintains their watering schedule, this golden root system expands, becoming more intricate and glowing brighter. It physically connects the pots on the gallery floor.  
* **Decay:** If the streak is at risk, the gold tarnishes. The light in the "Infinite Garden" dims, shifting from a warm "Golden Hour" sun to a cold, blue "Twilight." This atmospheric shift utilizes the user's *loss aversion* more effectively than a simple notification.33

## ---

**5\. Botanical Logic and The "Wither" Mechanic**

To satisfy the requirement for research-backed care, the application will integrate a rigorous botanical database. This data drives the notification engine and the visual state of the 3D models.

### **5.1 Watering Frequency and Logic**

The system will calculate the optimal watering window based on the specific plant species and the user's hemisphere (detected via IP geolocation to determine season).

| Specimen | Watering Logic (Summer) | Watering Logic (Winter) | Visual "Wither" Cues (Stage Reversion) |
| :---- | :---- | :---- | :---- |
| **Monstera Albo** | Every 7-10 Days | Every 14-20 Days | Leaves droop heavily; variegation turns beige. |
| **Fiddle Leaf Fig** | Every 7 Days | Every 14 Days | Lower leaves yellow and drop; canopy thins. |
| **Raven ZZ** | Every 21 Days | Every 45 Days | Stems shrivel vertically; glossiness fades to matte. |
| **Spiritus Sancti** | Every 5-7 Days | Every 10-14 Days | Leaf edges curl inward ("tacoing"); stems limp. |
| **Pink Princess** | Every 7 Days | Every 14 Days | Pink sections fade to grey; new growth stunts. |
| **Musa Aeae** | Every 3-4 Days | Every 7 Days | Massive leaves tear; petioles collapse. |
| **Bonsai** | Daily (Mist/Check) | Every 3 Days | Needles turn brittle/brown; branch flexibility lost. |

### **5.2 The "Wither" Animation (Reverse Growth)**

The requirement is to animate the plant "shrinking to the last iteration" when neglected. This is handled by the Morph Target system in reverse.

* **Trigger:** When days\_since\_watered \> max\_frequency.  
* **The Animation:**  
  * **Phase 1 (Warning):** The health uniform passed to the shader drops from 1.0 to 0.5. The plant's color desaturates slightly, and a vertex displacement map applies a "droop" effect to the leaves.14  
  * **Phase 2 (Regression):** If the user misses the window entirely, the morphTargetInfluence smoothly interpolates *backwards*. If the plant was at Stage 15, it slowly morphs back to Stage 14, then 13\.  
  * **Visual Feedback:** This shrinking is accompanied by a dry, cracking sound effect and a subtle "dust" particle effect, emphasizing the loss of vitality.  
* **The Revival:** When the user finally waters the plant, the animation plays in fast-forward (2x speed) back to its original stage, creating a highly satisfying "recovery" moment that reinforces the behavior.31

## ---

**6\. Implementation Roadmap: Building Project Eden**

This roadmap utilizes Tempo for rapid UI scaffolding and "Agent+" for generating boilerplate, allowing the senior engineering team to focus on the R3F pipeline.

### **Phase 1: Foundation and UI Architecture (Weeks 1-2)**

**Goal:** Establish the project structure and "Luxury" visual language.

1. **Project Initialization:**  
   * Use Tempo to spin up a **React \+ TypeScript \+ Vite** template.  
   * Configure **Tailwind CSS** with a custom "Luxury" palette: Void Black (\#050505), Gold Leaf (\#D4AF37), Deep Emerald (\#004030).  
2. **UI Component Scaffolding (Tempo Agent+):**  
   * *Prompt to Tempo:* "Create a mobile-responsive HUD overlay. Include a translucent bottom navigation bar with glassmorphism blur. Use serif fonts for headings and sans-serif for data." 34  
   * *Refinement:* Use Tempo’s visual editor to adjust the padding and corner radius of the buttons to ensure they are "thumb-friendly" for mobile users.35  
3. **Route Setup:**  
   * Implement react-router-dom. Define routes: / (Splash), /onboarding, /garden (Home), /care/:id (Detail View).

### **Phase 2: The Asset Factory and 3D Pipeline (Weeks 3-4)**

**Goal:** Generate and optimize the 50 keyframe assets (10 plants x 5 stages).

1. **AI Generation:**  
   * Script requests to **Meshy AI API** or **Tripo 3D**.  
   * *Prompt Structure:* "Isolate \[Plant Name\],, PBR textures, white background."  
   * Generate 5 stages for all 10 plants.  
2. **Optimization Pipeline:**  
   * Import raw .obj files into **Blender**.  
   * **Retopology:** Clean up the meshes to ensure consistent vertex counts between stages (crucial for morphing).  
   * **Texture Baking:** Bake high-res normals and roughness maps onto lower-poly meshes.  
   * **Compression:** Export as .glb. Run through gltf-transform to apply **Draco** compression and **KTX2** texture compression. This is vital for keeping the app size under 50MB for mobile performance.36

### **Phase 3: The R3F Engineering (Weeks 5-6)**

**Goal:** Build the "Engine" that renders the garden.

1. **Scene Graph Implementation:**  
   * Create the \<GameScene /\> component containing the \<Canvas\>.  
   * Implement \<ScrollControls\> to drive the camera movement along the horizontal garden.  
2. **Shader Development:**  
   * Write the **Growth Shader** (Vertex Shader) that handles the leaf unfurling logic.  
   * Write the **Wither Shader** (Fragment Shader) that handles desaturation and browning based on the health prop.  
3. **Interaction Logic:**  
   * Implement useInteraction hooks. When a plant is tapped, use maath to smoothly interpolate the camera's position and fov to the "Inspection" coordinates.

### **Phase 4: Integration and "Juice" (Weeks 7-8)**

**Goal:** Connect logic and add polish.

1. **State Wiring:**  
   * Connect the **Zustand** store to the 3D components. Ensure that waterPlant(id) actions trigger the particle system and morph target updates.  
2. **Notification System:**  
   * Integrate a service like **OneSignal** or the native **Web Push API**.  
   * Logic: Run a daily check on lastWatered dates. If today \- lastWatered \> frequency, trigger a push notification: *"Your Monstera is thirsting for your attention."*  
3. **Sound and Haptics:**  
   * Integrate use-sound for React.  
   * *Audio Profile:* "Crystalline" chimes for UI interactions, "Deep Water" sounds for the watering action.  
   * *Haptics:* Use the Navigator.vibrate() API (patterned pulses) to sync with the "thud" of the plant landing during onboarding.27

### **Phase 5: Quality Assurance and Launch (Week 9\)**

**Goal:** Ensure "Award-Winning" performance.

1. **Performance Profiling:**  
   * Use React Profiler to ensure no unnecessary re-renders.  
   * Monitor GPU memory usage. If distinct textures are too heavy, implement **Texture Atlasing** (combining textures into one large map) for the garden view.  
2. **Device Testing:**  
   * Test specifically on high-end devices (iPhone 15 Pro, Pixel 8\) to tune the 120Hz smooth scrolling.  
   * Test on mid-range devices to ensure the fallback (lower resolution, disabled DoF) works gracefully.

## ---

**7\. Risk Management and Scalability**

### **7.1 Asset Weight on Mobile Networks**

**Risk:** High-fidelity 3D assets (even compressed) are heavy. Downloading 10 plants at once could cause long load times.

**Mitigation:** Implement **Progressive Loading** and **Level of Detail (LOD)**.

* *LOD Strategy:* In the "Infinite Garden" view, load low-poly "proxy" models first. Only when the user stops scrolling or selects a plant do we stream in the high-fidelity "Hero" asset.  
* *Caching:* Use Service Workers (PWA standard) to cache the assets locally after the first load, making subsequent visits instant.

### **7.2 Browser Compatibility**

**Risk:** WebGL support varies, especially on older iOS versions.

**Mitigation:**

* Use @react-three/drei's \<Stats /\> and \<PerformanceMonitor /\> to dynamically lower the visual quality (disable shadows, reduce resolution) if the frame rate drops below 40fps.  
* Ensure a "Safe Mode" fallback that displays high-quality 2D renders (pre-rendered from the 3D models) for devices that cannot handle the R3F context.

### **7.3 Maintaining the "Luxury" Illusion**

**Risk:** Procedural animations can sometimes look "glitchy" or robotic.

**Mitigation:**

* Manual curation of the interpolation curves. The animation cannot be linear. It must use "Ease-In-Out-Elastic" curves to feel organic.  
* Extensive user testing with the target demographic (or proxies) to ensure the "feel" aligns with their expectations of luxury software.

## ---

**8\. Conclusion**

Project Eden represents the convergence of high-end botanical culture and cutting-edge web engineering. By utilizing **Tempo** for rapid, AI-assisted UI development and **React Three Fiber** for a bespoke, cinema-grade rendering engine, we can deliver an application that meets the exacting standards of the billionaire demographic. The implementation of the **Hybrid AI-Procedural Asset Pipeline** solves the scale problem of the "30 stages" requirement, turning a potential bottleneck into a signature aesthetic feature. The result is not merely an app for watering plants, but a digital sanctuary that preserves and gamifies the user's legacy, ensuring high retention and a truly "award-winning" user experience.

---

**Citations:**

1

#### **Works cited**

1. 56 Amazing Award Winning Websites to Inspire You in 2025, accessed December 9, 2025, [https://hireadrian.com/award-winning-websites/](https://hireadrian.com/award-winning-websites/)  
2. UI/UX Design Trends in Mobile Apps for 2025 | Chop Dawg, accessed December 9, 2025, [https://www.chopdawg.com/ui-ux-design-trends-in-mobile-apps-for-2025/](https://www.chopdawg.com/ui-ux-design-trends-in-mobile-apps-for-2025/)  
3. Sites Of The Year \- Awwwards, accessed December 9, 2025, [https://www.awwwards.com/websites/sites\_of\_the\_year/](https://www.awwwards.com/websites/sites_of_the_year/)  
4. Tutorial: Use react-three-fiber to render 3D in-browser visuals \- The Software House, accessed December 9, 2025, [https://tsh.io/blog/react-three-fiber](https://tsh.io/blog/react-three-fiber)  
5. Fractals to Forests – Creating Realistic 3D Trees with Three.js \- Codrops, accessed December 9, 2025, [https://tympanus.net/codrops/2025/01/27/fractals-to-forests-creating-realistic-3d-trees-with-three-js/](https://tympanus.net/codrops/2025/01/27/fractals-to-forests-creating-realistic-3d-trees-with-three-js/)  
6. Tempo Labs \- AI Agent Store, accessed December 9, 2025, [https://aiagentstore.ai/ai-agent/tempo-labs](https://aiagentstore.ai/ai-agent/tempo-labs)  
7. Tempo \- AI Tool for Devs \- EveryDev.ai, accessed December 9, 2025, [https://www.everydev.ai/tools/tempo](https://www.everydev.ai/tools/tempo)  
8. Tempo AI: The Ultimate Guide to Building React Apps Faster, accessed December 9, 2025, [https://skywork.ai/skypage/en/Tempo-AI-The-Ultimate-Guide-to-Building-React-Apps-Faster/1976119186155040768](https://skywork.ai/skypage/en/Tempo-AI-The-Ultimate-Guide-to-Building-React-Apps-Faster/1976119186155040768)  
9. Tempo Labs: AI React Development Automation Platform \- OneClick IT Consultancy, accessed December 9, 2025, [https://www.oneclickitsolution.com/centerofexcellence/aiml/tempo-labs-ai-react-development-automation](https://www.oneclickitsolution.com/centerofexcellence/aiml/tempo-labs-ai-react-development-automation)  
10. Introduction \- React Three Fiber, accessed December 9, 2025, [https://r3f.docs.pmnd.rs/getting-started/introduction](https://r3f.docs.pmnd.rs/getting-started/introduction)  
11. Starter Repo and Github Integration \- Tempo, accessed December 9, 2025, [https://tempolabsinc.mintlify.app/Basics/Starter%20Repo%20and%20Github%20Integration](https://tempolabsinc.mintlify.app/Basics/Starter%20Repo%20and%20Github%20Integration)  
12. Installation \- React Three Fiber, accessed December 9, 2025, [https://r3f.docs.pmnd.rs/getting-started/installation](https://r3f.docs.pmnd.rs/getting-started/installation)  
13. Examples \- React Three Fiber, accessed December 9, 2025, [https://r3f.docs.pmnd.rs/getting-started/examples](https://r3f.docs.pmnd.rs/getting-started/examples)  
14. The Study of Shaders with React Three Fiber \- Maxime Heckel Blog, accessed December 9, 2025, [https://blog.maximeheckel.com/posts/the-study-of-shaders-with-react-three-fiber/](https://blog.maximeheckel.com/posts/the-study-of-shaders-with-react-three-fiber/)  
15. Scheduling Limits | Tempo Help Center, accessed December 9, 2025, [https://help.tempo.io/portfoliomanager/latest/scheduling-limits](https://help.tempo.io/portfoliomanager/latest/scheduling-limits)  
16. The Most Expensive Houseplants of 2025: Greenery That's Worth the Investment \- Soltech, accessed December 9, 2025, [https://soltech.com/blogs/blog/the-most-expensive-houseplants-of-2025-greenery-that-s-worth-the-investment](https://soltech.com/blogs/blog/the-most-expensive-houseplants-of-2025-greenery-that-s-worth-the-investment)  
17. Trending Houseplants 2025: Top Picks for Your Home \- All About Planties, accessed December 9, 2025, [https://allaboutplanties.com/blogs/indoor-plant-care-tips-and-tricks/trending-houseplants-2025-popular-picks-us-homes](https://allaboutplanties.com/blogs/indoor-plant-care-tips-and-tricks/trending-houseplants-2025-popular-picks-us-homes)  
18. How to Care for Raven ZZ plants \- Luis' Nursery | Visalia, California, accessed December 9, 2025, [http://luisnursery.com/how-to-care-for-raven-zz-plants/](http://luisnursery.com/how-to-care-for-raven-zz-plants/)  
19. Best AI 3D Model Generators: Top Tools, Trends and Insights \- DesignRush, accessed December 9, 2025, [https://www.designrush.com/agency/product-design/trends/ai-3d-model-generators](https://www.designrush.com/agency/product-design/trends/ai-3d-model-generators)  
20. Image to 3D API \- Meshy Docs, accessed December 9, 2025, [https://docs.meshy.ai/api/image-to-3d](https://docs.meshy.ai/api/image-to-3d)  
21. Stable TripoSR 3D API — One API 400+ AI Models | AIMLAPI.com, accessed December 9, 2025, [https://aimlapi.com/models/stable-tripo-sr-api](https://aimlapi.com/models/stable-tripo-sr-api)  
22. Is AI Ready for High‑Quality 3D Assets in 2025? \- SimInsights, accessed December 9, 2025, [https://www.siminsights.com/ai-3d-generators-2025-production-readiness/](https://www.siminsights.com/ai-3d-generators-2025-production-readiness/)  
23. Morph targets keyframes? \- Questions \- three.js forum, accessed December 9, 2025, [https://discourse.threejs.org/t/morph-targets-keyframes/1896](https://discourse.threejs.org/t/morph-targets-keyframes/1896)  
24. Are morph target animations possible in Threejs using a Blender object? \- Stack Overflow, accessed December 9, 2025, [https://stackoverflow.com/questions/60189717/are-morph-target-animations-possible-in-threejs-using-a-blender-object](https://stackoverflow.com/questions/60189717/are-morph-target-animations-possible-in-threejs-using-a-blender-object)  
25. Morph Targets on GLTF models \- Questions \- three.js forum, accessed December 9, 2025, [https://discourse.threejs.org/t/morph-targets-on-gltf-models/61540](https://discourse.threejs.org/t/morph-targets-on-gltf-models/61540)  
26. How to Code a Shader Based Reveal Effect with React Three Fiber & GLSL | Codrops, accessed December 9, 2025, [https://tympanus.net/codrops/2024/12/02/how-to-code-a-shader-based-reveal-effect-with-react-three-fiber-glsl/](https://tympanus.net/codrops/2024/12/02/how-to-code-a-shader-based-reveal-effect-with-react-three-fiber-glsl/)  
27. React-Native Haptic Feedback for iOS with Android similar behaviour. \- GitHub, accessed December 9, 2025, [https://github.com/mkuczera/react-native-haptic-feedback](https://github.com/mkuczera/react-native-haptic-feedback)  
28. How to Create Scene Transitions with React Three Fiber \- Wawa Sensei, accessed December 9, 2025, [https://wawasensei.dev/tuto/how-to-create-scene-transitions-with-react-three-fiber](https://wawasensei.dev/tuto/how-to-create-scene-transitions-with-react-three-fiber)  
29. The magical world of Particles with React Three Fiber and Shaders \- Maxime Heckel Blog, accessed December 9, 2025, [https://blog.maximeheckel.com/posts/the-magical-world-of-particles-with-react-three-fiber-and-shaders/](https://blog.maximeheckel.com/posts/the-magical-world-of-particles-with-react-three-fiber-and-shaders/)  
30. Streaks and Milestones for Gamification in Mobile Apps \- Plotline, accessed December 9, 2025, [https://www.plotline.so/blog/streaks-for-gamification-in-mobile-apps](https://www.plotline.so/blog/streaks-for-gamification-in-mobile-apps)  
31. Gamification in Learning: How to Use Streaks \- Growth Engineering, accessed December 9, 2025, [https://www.growthengineering.co.uk/gamification-streaks/](https://www.growthengineering.co.uk/gamification-streaks/)  
32. ScrollControls \- React-Three-Drei, accessed December 9, 2025, [https://drei.docs.pmnd.rs/controls/scroll-controls](https://drei.docs.pmnd.rs/controls/scroll-controls)  
33. Designing Streaks for Long-Term User Growth \- Nuance Behavior, accessed December 9, 2025, [https://www.nuancebehavior.com/article/designing-streaks-for-long-term-user-growth](https://www.nuancebehavior.com/article/designing-streaks-for-long-term-user-growth)  
34. Tempo Review 2025 | Software Engineering Tool \- Pricing & Features \- AI Agents List, accessed December 9, 2025, [https://aiagentslist.com/agent/tempo](https://aiagentslist.com/agent/tempo)  
35. Top Mobile App Design Trends You Should Watch For In 2025 \- Natively, accessed December 9, 2025, [https://natively.dev/blog/top-mobile-app-design-trends-2025](https://natively.dev/blog/top-mobile-app-design-trends-2025)  
36. Ai to Code Development | Blog | Tempo | Build Web Apps 10x Faster, accessed December 9, 2025, [https://www.tempo.new/blog](https://www.tempo.new/blog)  
37. 10 Best Feng Shui Plants for Wealth & Positive Energy \- Planters Etc, accessed December 9, 2025, [https://plantersetcetera.com/blogs/plant-guides/feng-shui-plants](https://plantersetcetera.com/blogs/plant-guides/feng-shui-plants)  
38. How To Care for a Monstera Deliciosa \- The Sill, accessed December 9, 2025, [https://www.thesill.com/blogs/plants-101/how-to-care-for-monstera-monstera-deliciosa](https://www.thesill.com/blogs/plants-101/how-to-care-for-monstera-monstera-deliciosa)  
39. How often should you water a fiddle leaf fig? \- BloomsyBox, accessed December 9, 2025, [https://www.bloomsybox.com/blog/posts/how-often-should-you-water-a-fiddle-leaf-fig](https://www.bloomsybox.com/blog/posts/how-often-should-you-water-a-fiddle-leaf-fig)  
40. Text to 3D API \- Meshy Docs, accessed December 9, 2025, [https://docs.meshy.ai/api/text-to-3d](https://docs.meshy.ai/api/text-to-3d)  
41. React Native Audio API \- Software Mansion, accessed December 9, 2025, [https://docs.swmansion.com/react-native-audio-api/](https://docs.swmansion.com/react-native-audio-api/)