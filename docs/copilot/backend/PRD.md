# Athlify Backend – Product Requirements Document

**Project**: Athlify
**Last Updated**: 2026-09-09
**Status**: Active

## Purpose

Athlify is a self-hosted web application for cyclists. It records personal cycling activities, imports data from Strava and makes training, body and equipment data easy to analyze.

The functional reference document is [`../../concept/CONCEPT.md`](../../concept/CONCEPT.md). This PRD summarizes the implementation-relevant scope for Copilot; it does not replace the concept.

## Target Users and Problem

The target audience is people who cycle recreationally or as a hobby. Strava provides activity records, but does not present the desired individual combination of activities, bicycles, gadgets, body data and Events in one view.

## Goals

- capture and manage personal cycling data centrally;
- synchronize Strava activities without creating duplicates;
- visualize trends clearly in the Dashboard;
- add and enrich activities manually afterward;
- document bicycles, gadgets, Body-Stats and Events in a personal context;
- deliver a limited scope that is realistic for a two-person student project.

## Features

The backend provides the reliable data and domain-logic contract for the frontend. It is responsible for ownership checks, calculations, persistence, synchronization and consistent error responses.

### Must Have

- Registration, login and logout;
- manually record, view, edit and delete personal activities;
- connect Strava and synchronize activities;
- Dashboard with:
  - Track Metrics: distance, time, elevation gain, TSS and speed;
  - Fitness Metrics: CTL/Fitness, ATL/Fatigue and TSB/Form;
  - Body Metrics: weight, body fat, muscle, water and bone percentage;
  - charts, activity distribution and timeline;
  - filters for period, tags, Indoor/Outdoor and bicycle;
- manage bicycles in the Garage;
- assign personal data unambiguously to the logged-in user.

### Should Have

- manage gadgets;
- manage Body-Stats across multiple measurement points;
- manage Events such as accidents, injuries, repairs, breaks and goals;
- display Activities as a list, detail form and calendar with weekly summary;
- merge activities without losing the original activities;
- German and English for central interfaces.

### Could Have

- optional user-account administration;
- additional convenience functions if they do not endanger the core scope.

## Non-Goals

- no live activity recording;
- no support for other sports in the initial scope;
- no group, club or social functions;
- no public project or documentation website;
- no demo mode without a user account;
- no subscription or payment function.

## Success Metrics and Acceptance Criteria

- A user sees and edits only their own personal data.
- A synchronized record is not created twice during repeated synchronization.
- Dashboard filters apply consistently to metrics, charts, activity timeline and Events.
- Activities without data show a clear empty state instead of misleading zero values.
- Values that cannot be changed directly or are calculated automatically are clearly recognizable in the form.
- After an Activity is deleted, a later Strava sync must not unexpectedly make it active again.
- Changes and errors are reported clearly to the user.
- Every personal query and mutation enforces the user context server-side.
- Repeated synchronizations are idempotent and handle external references unambiguously.

## Prioritization for Copilot

When requirements compete, first preserve data ownership and safe activity management, then Dashboard analysis, then Garage, Body-Stats and Events. Convenience features must not complicate an unfinished core function.

## Open domain decisions

- Which TSS values are permitted without power or heart-rate data?
- Are tags entered freely or selected from a managed list?
- How is Indoor/Outdoor determined unambiguously from Strava?
- May an Activity belong to multiple merges?

## Constraints

- The current implementation is a small GraphQL/Hot Chocolate prototype, not
  the complete Athlify product.
- The project remains limited to a realistic scope for a two-person student
  project.
- Personal data must remain isolated to the logged-in user.
