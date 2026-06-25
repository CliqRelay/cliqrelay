// CliqRelay Guide PDF Template
// Standalone test: place data.json + logo.png + images alongside, then run:
//   typst compile --font-path . guide.typ output.pdf

#let data = json("data.json")
#let g = data.guide
#let steps = data.steps

// -------- Colors (matching frontend Tailwind palette) --------
#let foreground = oklch(18%, 1%, 250deg)
#let muted-fg = oklch(50%, 1.5%, 250deg)
#let muted-bg = oklch(97%, 0.5%, 250deg)
#let border-color = oklch(92%, 0.8%, 250deg)
#let indicator-yellow = rgb("#eab308")

// Canvas alert colors (Tailwind equivalents)
#let tip-bg = rgb("#EFF6FF")
#let tip-border = rgb("#3B82F6")
#let tip-fg = rgb("#1D4ED8")
#let callout-bg = rgb("#F9FAFB")
#let callout-border = rgb("#6B7280")
#let callout-fg = rgb("#374151")
#let alert-bg = rgb("#FEF2F2")
#let alert-border = rgb("#EF4444")
#let alert-fg = rgb("#B91C1C")

// -------- Logo --------
#let logo-img = image("logo.png", height: 32pt)

// -------- Page Setup --------
#set page(paper: "a4", margin: (top: 2.5cm, bottom: 2.5cm, left: 2cm, right: 2cm))
#set text(font: "Inter", size: 11pt, fill: foreground)
#set page(footer: context {
  grid(
    columns: (1fr, auto),
    align(left, text(size: 8pt, fill: muted-fg, "Made with CliqRelay")),
    align(right, text(size: 8pt, fill: muted-fg, counter(page).display())),
  )
})

// -------- Guide Header --------
#align(center, logo-img)
#v(8pt)
#align(center, text(size: 18pt, weight: "bold", g.title))
#if g.description != none {
  v(4pt)
  align(center, text(size: 10pt, fill: muted-fg, g.description))
}
#v(4pt)
#align(center, text(size: 9pt, fill: muted-fg, "Duration: " + g.duration + "  ·  " + g.created_at))
#v(16pt)

// -------- Helper Functions --------

#let step-number(n) = {
  circle(
    radius: 12pt,
    fill: white,
    stroke: 1pt + foreground,
    text(size: 10pt, weight: "bold", fill: foreground, str(n)),
  )
}

#let screenshot-block(media, target) = {
  if media == none { return }
  let img = image(media.file_name, width: 100%)
  let has-overlay = target != none and target.click_x != none and target.click_y != none and target.viewport_width != none and target.viewport_height != none and target.viewport_width > 0 and target.viewport_height > 0
  block(width: 100%, stroke: 1pt + border-color, radius: 4pt, inset: 0pt)[
    #img
    #if has-overlay {
      let rx = target.click_x / target.viewport_width * 100%
      let ry = target.click_y / target.viewport_height * 100%
      place(top + left, dx: rx - 10pt, dy: ry - 10pt,
        circle(radius: 10pt, stroke: 1.5pt + indicator-yellow, fill: indicator-yellow.transparentize(80%)),
      )
    }
  ]
}

#let notes-block(note-text) = {
  if note-text == none { return }
  block(fill: muted-bg, inset: 8pt, radius: 4pt,
    text(size: 10pt, fill: foreground, note-text),
  )
}

#let canvas-header(heading) = {
  align(center, text(size: 14pt, weight: "bold", fill: muted-fg, heading))
  v(8pt)
}

#let canvas-alert(type, heading, body, media) = {
  let (icon, bg, border, fg) = {
    if type == "tip" { ("\u{2139}", tip-bg, tip-border, tip-fg) }
    else if type == "callout" { ("\u{201C}", callout-bg, callout-border, callout-fg) }
    else if type == "alert" { ("\u{26A0}", alert-bg, alert-border, alert-fg) }
    else { ("", white, border-color, foreground) }
  }
  block(width: 100%, fill: bg, stroke: (left: 4pt + border), radius: 4pt,
    inset: (top: 10pt, bottom: 10pt, left: 12pt, right: 10pt))[
    #grid(columns: (auto, 1fr), gutter: 8pt,
      { set text(fill: fg, size: 22pt); icon },
      [
        #if heading != none {
          set text(fill: fg, size: 11pt, weight: "bold")
          heading
        }
        #if body != none {
          v(2pt)
          set text(fill: fg, size: 10pt)
          body
        }
      ],
    )
  ]
  if media != none {
    v(4pt)
    screenshot-block(media, none)
  }
}

#let step-card(n, step) = {
  block(stroke: 1pt + border-color, radius: 8pt, inset: 12pt, breakable: false)[
    #grid(columns: (auto, 1fr), gutter: 8pt,
      step-number(n),
      [
        #v(7pt)
        #text(size: 12pt, weight: "bold",
          if step.action_text != none { step.action_text } else { "Step " + str(n) },
        )
      ],
    )
    #v(8pt)
    #screenshot-block(step.media, step.target_element)
    #if step.notes != none {
      v(8pt)
      notes-block(step.notes)
    }
  ]
}

#let empty-state = {
  align(center + horizon,
    block(width: 100%, height: 120pt, stroke: (paint: border-color, thickness: 2pt, dash: "dashed"),
      radius: 8pt, fill: muted-bg, inset: 20pt,
      text(size: 12pt, fill: muted-fg, "No steps yet"),
    ),
  )
}

// -------- Main Render Loop --------
#if steps.len() == 0 {
  empty-state
}
#let step-num = 0
#for step in steps {
  v(12pt)
  if step.type == "interaction" {
    step-num = step-num + 1
    step-card(step-num, step)
  } else if step.type == "canvas" {
    let cc = step.canvas_content
    if cc != none {
      if cc.type == "header" {
        canvas-header(
          if cc.heading_text != none { cc.heading_text } else { "" },
        )
      } else {
        canvas-alert(cc.type, cc.heading_text, cc.body_text, step.media)
      }
    }
  }
}
