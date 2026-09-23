# Athlify — Product Requirements Document

**Project**: Athlify  
**Last Updated**: 2026-09-23
**Status**: Active

## Vision

Athlify is a self-hosted web application for cyclists who want to combine
imported and manually entered cycling activities with personal training,
equipment, body and event data in one clear analysis experience.

The detailed functional requirements remain in the
[functional concept](../concept/CONCEPT.md). This document is the canonical
requirements entry point for the configured documentation root.

## Target Users

The primary users are recreational or hobby cyclists who want a personal
overview of their cycling history and related data. The immediate project
context is a two-person student project.

## Goals

- Import cycling activities from Strava without creating duplicates.
- Support manual activity management and personal data ownership.
- Provide understandable Dashboard metrics, trends, filters and timelines.
- Manage bicycles, gadgets, Body-Stats and Events in the user's context.
- Provision an initial Administrator who can manage user accounts and still
  use the complete personal-user experience, including the Dashboard.
- Deliver a feasible scope for the current student project.

## Non-Goals

- Live activity recording.
- Sports other than cycling in the initial scope.
- Group, club, social, subscription or payment features.
- A public demo without a user account.

## Features

The functional scope of each feature area is defined in the concept:

- [Login and user account](../concept/CONCEPT.md#31-login-and-user-account)
- [Dashboard](../concept/CONCEPT.md#32-dashboard)
- [Activity management](../concept/CONCEPT.md#33-activity-management)
- [Strava synchronization](../concept/CONCEPT.md#34-strava-synchronization)
- [Garage: bicycles and gadgets](../concept/CONCEPT.md#35-garage-bicycles-and-gadgets)
- [Body-Stats](../concept/CONCEPT.md#36-body-stats)
- [Events](../concept/CONCEPT.md#37-events)
- [Settings and language](../concept/CONCEPT.md#38-settings-and-language)

Priorities (Must/Should/Could Have) are in the
[user stories](../concept/user_stories.md).

## Success Metrics

- The acceptance criteria of all Must Have
  [user stories](../concept/user_stories.md) are met.
- The [quality requirements](../concept/CONCEPT.md#7-quality-requirements) are met, including
  server-side ownership enforcement and idempotent synchronization.

## Detailed Requirements

- [Functional concept](../concept/CONCEPT.md)
- [User stories and acceptance criteria](../concept/user_stories.md)
- [Frontend requirements](frontend/PRD.md)
- [Backend requirements](backend/PRD.md)

## Constraints

- The repository currently contains a Body-Stats GraphQL backend prototype
  under `src/backend/`, not the complete product.
- The frontend app shell exists under `src/frontend/athlify/`, but product
  functionality and backend integration are not implemented yet.
- Personal data must remain isolated to the logged-in user.
- The user interface is bilingual in German and English; documentation is
  English-only.
