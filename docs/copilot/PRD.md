# Athlify — Product Requirements Document

**Project**: Athlify  
**Last Updated**: 2026-09-15  
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
- Deliver a feasible scope for the current student project.

## Non-Goals

- Live activity recording.
- Sports other than cycling in the initial scope.
- Group, club, social, subscription or payment features.
- A public demo without a user account.

## Detailed Requirements

- [Functional concept](../concept/CONCEPT.md)
- [User stories and acceptance criteria](../concept/user_stories.md)
- [Frontend requirements](frontend/PRD.md)
- [Backend requirements](backend/PRD.md)

## Constraints

- The repository currently contains a small backend prototype, not the
  complete product.
- No independent frontend source exists yet.
- Personal data must remain isolated to the logged-in user.
- The user interface is bilingual in German and English; documentation is
  English-only.
