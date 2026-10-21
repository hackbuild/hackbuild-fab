"""Local paths for files named in the publish form of tools/publish-paths.mjs.

The Python side of tools/test-support/originals-root.ts: a source written
fab-knowledge:originals/<path>, fab-knowledge:<path>, fab-work-directory:<path>
or <sibling repo>/<path> is read from HBF_ORIGINALS, HBF_FAB_KNOWLEDGE,
HBF_FAB_WORK_DIRECTORY or HBF_REPOS when set, else from the folder of that
name next to this repository. No home path is written into a tracked file.

source_path() maps without checking, for a read a test guards with
os.path.exists (pytest skips it where the archive is absent). local_source()
exits naming the variable when the archive is absent, for scripts that
record from the originals and must never pass without them.
"""

import os
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
NEAR = os.path.dirname(REPO)

# prefix, variable, default folder next to the repository, what the archive is
ARCHIVES = (
    ("fab-knowledge:originals/", "HBF_ORIGINALS", os.path.join(NEAR, "fab-knowledge", "originals"), "fab-knowledge/originals"),
    ("fab-knowledge:", "HBF_FAB_KNOWLEDGE", os.path.join(NEAR, "fab-knowledge"), "fab-knowledge"),
    ("fab-work-directory:", "HBF_FAB_WORK_DIRECTORY", os.path.join(NEAR, "fab-work-directory"), "fab-work-directory"),
)
REPOS_VAR = "HBF_REPOS"


def _place(source):
    if source.startswith("/"):
        raise ValueError(f"{source} is an absolute path; name a source by archive prefix (tools/publish-paths.mjs)")
    for prefix, var, fallback, what in ARCHIVES:
        if source.startswith(prefix):
            return var, fallback, what, source[len(prefix):]
    head = source.split("/")[0]
    if os.path.exists(os.path.join(REPO, head)):
        return None, REPO, "this repository", source
    return REPOS_VAR, NEAR, "the sibling repositories", source


def _root(var, fallback):
    set_ = os.environ.get(var) if var else None
    return (set_ or fallback), set_


def source_path(source):
    """The local path for a publish-form source, without checking that its archive is here."""
    var, fallback, _, rel = _place(source)
    root, _ = _root(var, fallback)
    return os.path.join(root, rel)


def local_source(source):
    """The local path for a publish-form source; exits naming the variable when the archive is absent."""
    var, fallback, what, rel = _place(source)
    root, set_ = _root(var, fallback)
    if not os.path.isdir(root):
        why = f"{var}={set_} does not exist" if set_ else f"{var} is unset and {root} does not exist"
        sys.exit(f"{what} not found: {why}. set {var} to a copy of {what}")
    return os.path.join(root, rel)
