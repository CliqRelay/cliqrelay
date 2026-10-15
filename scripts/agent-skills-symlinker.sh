#!/bin/bash

# Symlinks the skills from .agents/skills to other agent directories

rm -rf .claude/skills .opencode/skills

mkdir -p .claude .opencode
for dir in .claude .opencode; do
  ln -sf ../.agents/skills "$dir/skills"
done
