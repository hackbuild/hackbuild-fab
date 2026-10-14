// M07-T13: sparrow as one wasm function for the evaluation (D-137, D-129).
// Ported from sparrow-studio web/wasm/src/lib.rs run() (MIT, commit
// a738c18d9c28e371983b164129190dad1616d273): parse the instance, import it,
// optimize, export. Three changes. The studio's listener and interrupt
// callbacks are dropped, since a bake reads one result. The configuration is
// the one sparrow's CLI builds (src/cli.rs at the pinned sparrow commit):
// DEFAULT_SPARROW_CONFIG, the time limit split 0.8 and 0.2, and with early
// termination the failure-based stop of the -x flag. The output is the
// CLI's final JSON, instance and solution, so one reader takes both runs.
// No thread pool: on wasm32 the separator runs its workers on the global
// rayon pool, which without the atomics target feature is the caller's
// thread, so the build needs no Worker and no shared memory.

use jagua_rs::io::import::Importer;
use jagua_rs::probs::spp::io::ext_repr::ExtSPInstance;
use jagua_rs::probs::spp::io::{export, import_instance};
use rand::SeedableRng;
use rand::rngs::Xoshiro256PlusPlus;
use sparrow::EPOCH;
use sparrow::config::{DEFAULT_SPARROW_CONFIG, ShrinkDecayStrategy};
use sparrow::consts::{DEFAULT_COMPRESS_TIME_RATIO, DEFAULT_EXPLORE_TIME_RATIO, DEFAULT_FAIL_DECAY_RATIO_CMPR, DEFAULT_MAX_CONSEQ_FAILS_EXPL};
use sparrow::optimizer::optimize;
use sparrow::util::io::ExtSPOutput;
use sparrow::util::listener::DummySolListener;
use sparrow::util::terminator::BasicTerminator;
use std::time::Duration;
use wasm_bindgen::prelude::*;

/// Solve one strip packing instance; returns the CLI's final JSON (instance and solution).
#[wasm_bindgen]
pub fn solve(input: &str, seconds: u32, seed: u64, early_termination: bool, workers: usize) -> Result<String, JsValue> {
    let err = |e: &dyn std::fmt::Display| JsValue::from_str(&e.to_string());
    let mut config = DEFAULT_SPARROW_CONFIG;
    let total = Duration::from_secs(u64::from(seconds));
    config.expl_cfg.time_limit = total.mul_f32(DEFAULT_EXPLORE_TIME_RATIO);
    config.cmpr_cfg.time_limit = total.mul_f32(DEFAULT_COMPRESS_TIME_RATIO);
    if early_termination {
        config.expl_cfg.max_conseq_failed_attempts = Some(DEFAULT_MAX_CONSEQ_FAILS_EXPL);
        config.cmpr_cfg.shrink_decay = ShrinkDecayStrategy::FailureBased(DEFAULT_FAIL_DECAY_RATIO_CMPR);
    }
    if workers > 0 {
        config.expl_cfg.separator_config.n_workers = workers;
        config.cmpr_cfg.separator_config.n_workers = workers;
    }
    let ext_instance: ExtSPInstance = serde_json::from_str(input).map_err(|e| err(&e))?;
    let importer = Importer::new(config.cde_config, config.poly_simpl_tolerance, config.narrow_concavity_cutoff_ratio);
    let instance = import_instance(&importer, &ext_instance).map_err(|e| err(&e))?;
    let solution = optimize(
        instance,
        Xoshiro256PlusPlus::seed_from_u64(seed),
        &mut DummySolListener,
        &mut BasicTerminator::new(),
        &config.expl_cfg,
        &config.cmpr_cfg,
        None,
    )
    .map_err(|e| err(&e))?;
    let out = ExtSPOutput { instance: ext_instance, solution: export(&solution, *EPOCH) };
    serde_json::to_string(&out).map_err(|e| err(&e))
}
