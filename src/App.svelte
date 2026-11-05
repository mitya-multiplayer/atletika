<script lang="ts">
  import type { Component } from 'svelte';
  import { matchRoute, router } from './lib/router.svelte';
  import DialogHost from './lib/ui/DialogHost.svelte';
  import DayEditor from './screens/DayEditor.svelte';
  import Days from './screens/Days.svelte';
  import ExerciseConfig from './screens/ExerciseConfig.svelte';
  import ExerciseForm from './screens/ExerciseForm.svelte';
  import Exercises from './screens/Exercises.svelte';
  import ExerciseSelect from './screens/ExerciseSelect.svelte';
  import History from './screens/History.svelte';
  import Home from './screens/Home.svelte';
  import Kit from './screens/Kit.svelte';
  import Program from './screens/Program.svelte';
  import Series from './screens/Series.svelte';
  import Settings from './screens/Settings.svelte';
  import Workout from './screens/Workout.svelte';
  import WorkoutSummary from './screens/WorkoutSummary.svelte';

  // Navigation map: docs/ATLETIKA_PRODUCT_SPEC.md, section 6. Order matters.
  const routes: [string, Component<any>][] = [
    ['/', Home],
    ['/workout', Workout],
    ['/workout/:workoutId/summary', WorkoutSummary],
    ['/history', History],
    ['/settings', Settings],
    ['/program', Program],
    ['/days', Days],
    ['/days/:dayId', DayEditor],
    ['/days/:dayId/add', ExerciseSelect],
    ['/days/:dayId/series', Series],
    ['/days/:dayId/items/:itemId', ExerciseConfig],
    ['/exercises', Exercises],
    ['/exercises/new', ExerciseForm],
    ['/exercises/:exerciseId', ExerciseForm],
    ['/kit', Kit],
  ];

  const current = $derived.by((): { component: Component<any>; params: Record<string, string> } => {
    for (const [pattern, component] of routes) {
      const params = matchRoute(pattern, router.path);
      if (params) return { component, params };
    }
    return { component: Home, params: {} };
  });
</script>

{#key router.path}
  <current.component {...current.params} query={router.query} />
{/key}

<DialogHost />
