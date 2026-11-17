# sched-prod incident board — plan

The on-call board for sched-prod. One page, one list: tonight's incidents, newest first, so on-call sees
what just broke and takes it.

## Flows

| flow | who | what happens |
|------|-----|--------------|
| `open-board` | on-call | opens the board; sees tonight's incidents |
| `ack-incident` | on-call | picks an incident on the board and acks it — "I've got this one" |
| `watch-board` | on-call | keeps the board open; it stays current without a reload |

## Requirements

- **R1** New incidents appear live at the top of the list, newest first.
- **R2** *(changed by product after the step-1 proof)* A row has no Ack. Picking a row (click, Enter or Space) opens its **incident panel**, which names the incident; the panel's **Ack** sends the ack for the incident the panel names (`api.ack(id)`) and marks its row acked. New incidents never change what the panel names.
- **R3** Show a loader until incidents load.
- **R4** The board refreshes itself every 2 seconds while open.
- **R5** Times show in the viewer's local time; day before month for EU locales (dd/mm).
- **R6** The page names its build: `<meta name="build" content="<git sha>">` in the head and the same sha in the footer.

## Hooks (pinned — tests and the replay rely on them)

| `data-testid` | element |
|---------------|---------|
| `board` | the board's main area |
| `loader` | the loader (gone once incidents load) |
| `empty` | what shows when there are no incidents |
| `incident-list` | the list |
| `incident-row` | one incident row, with `data-id="<incident id>"` |
| ~~`ack`~~ | removed: rows carry no Ack (R2) |
| `incident-panel` | the incident panel, naming the incident id |
| `panel-ack` | the Ack in the panel |
| `acked` | the acked mark in a row |
| `build-sha` | the sha in the footer |

## Decisions

- **Ack leaves the row** (product, after the step-1 recording at 00:12: a new incident slid a row under the pointer and the click acked INC-8106 instead of INC-7105). New incidents stay live at the top (R1); Ack moves into the incident panel (R2).

## Done

Every issue in `issues/` delivered, deployed to a public https address, and shown working.
