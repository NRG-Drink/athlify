# Athlify – Software Concept

**Web-based application for visualizing and analyzing cycling activities**

| | |
|---|---|
| Project | Athlify |
| Context | CAS Frontend Engineering, OST – Eastern Switzerland University of Applied Sciences, Rapperswil |
| Document type | Functional software concept / big picture |
| Version | 1.7 |
| Date | 5 September 2026 |
| Authors | Beat Zimmermann & Marco Ebneter |

---

## Table of contents

1. [Management summary](#1-management-summary)
2. [Project overview](#2-project-overview)
3. [Functional project scope](#3-functional-project-scope)
4. [Roles and permissions](#4-roles-and-permissions)
5. [Use cases](#5-use-cases)
6. [User stories](#6-user-stories)
7. [Quality requirements](#7-quality-requirements)
8. [Wireframes](#8-wireframes)
9. [Roadmap](#9-roadmap)
10. [Risks and mitigation](#10-risks-and-mitigation)
11. [Technical detail documents](#11-technical-detail-documents)
12. [Open questions](#12-open-questions)

---

## 1. Management summary

Athlify is an open-source student project developed by a two-person team. The application is intended for cyclists who want to record their activities clearly, analyze them visually and manage personal cycling data.

Activities can be imported from Strava or entered manually. The Dashboard displays key metrics and trends in clear charts. Athlify also provides separate management for Activities, a Garage for bicycles and gadgets, Body-Stats and Events such as accidents or repairs. Events are displayed on the Dashboard in their chronological context.

The application focuses on functionality for individual users. After a simple login, all personal data is assigned to the respective user.

This document describes the functional big picture. Technical decisions and implementation details are maintained in separate documents under [`docs/concept/`](concept/).

---

## 2. Project overview

### 2.1 Starting point

Strava provides a good basis for recording activities, but only limited options for an individually designed overview of training development, bicycles, gadgets, body data and notable events. Athlify supplements this information with a personal, visually appealing analysis.

### 2.2 Objectives

Athlify pursues the following objectives:

- Display cycling activities clearly and attractively.
- Import activities from Strava.
- Enter, edit and delete activities manually.
- Provide a Dashboard with meaningful metrics and charts.
- Manage bicycles and gadgets in a personal Garage.
- Record and track Body-Stats over multiple points in time.
- Document notable Events such as accidents, repairs or other incidents.
- Assign personal data unambiguously through a simple login.
- Deliver a reasonable and feasible scope for a two-person student project.

### 2.3 Target audience

The primary target audience is cyclists, especially people who cycle recreationally or as a hobby. The immediate user group for the student project is the development team and the academic assessors.

### 2.4 Boundaries

Athlify is a supplementary analysis and management tool, not a replacement for Strava. The application does not record activities live. Sports other than cycling are outside the initial project scope. Group, club and social features are not planned either.

---

## 3. Functional project scope

### 3.1 Login and user account

The login page is the application's entry point. A user can log in with an email address and password. An initial admin user is provided so that user administration can be added later. After a successful login, the Dashboard opens.

- Login and logout.
- Assign all personal data to the logged-in user.

### 3.2 Dashboard

The Dashboard is the central view after login. It shows an understandable summary of personal cycling data:

- **Track Metrics**: distance in kilometers, time in hours, elevation gain, TSS (Training Stress Score) and speed in km/h.
- **Fitness Metrics**: Fitness (CTL – Chronic Training Load), Fatigue (ATL – Acute Training Load) and Form (TSB – Training Stress Balance).
- **Body Metrics**: weight, body-fat percentage, muscle percentage, water percentage and bone mass.
- Activity distribution by bicycle type.
- Distance development over time.
- Distance per bicycle.
- Activity calendar or timeline overview.
- Particularly relevant or recent activities.
- Events such as accidents or repairs at the appropriate point in time.

The three metric groups are displayed as visually distinct Dashboard areas. Charts should make trends over time easy to understand. The Dashboard can be filtered by the following criteria:

- Period or freely selectable date range.
- Activity tags.
- Activity type, especially Indoor or Outdoor.
- Bicycle used.

The filters apply to the displayed metrics, charts, activity trends and Events. The Dashboard should remain useful even when there is little or no data and should show a clear empty state.

### 3.3 Activity management

The Activities page provides complete management of cycling activities. It offers a list or table view, a detail view as a form and a calendar view with a weekly summary similar to TrainingPeaks. Activities can be imported from Strava, created manually, viewed, filtered, edited, deleted and merged.

The Activities page contains a visible **Strava sync button**. The button starts synchronization directly from activity management. The last synchronization time and any error status are displayed alongside it.

An activity contains, from a domain perspective:

- Date and activity type.
- An optionally assigned bicycle and the gadgets used.
- Time or duration, distance, average speed and elevation gain.
- TSS (Training Stress Score).
- Description and freely selectable tags.
- Minimum, maximum and average heart rate.
- Mood or personal well-being.
- Effort.
- Wind conditions.
- Data source: Strava or manual.

Some values are maintained or calculated automatically by the application and are marked with `*` in the edit form. These values cannot be edited directly.

Supported activity types include road bike, mountain bike, gravel and indoor cycling or trainer rides. Activities from other sports are not required. For imported Strava activities, locally maintained additional information may be edited. Deleted activities remain excluded from the active overview and must not reappear as active activities during a later synchronization.

Multiple activities can be grouped into a merged activity. The original activities remain traceable.

### 3.4 Strava synchronization

Users can connect their account to Strava and start synchronization manually. New and updated cycling activities should be imported without creating duplicate entries. Bicycles or Strava Gear can also be imported. The synchronization status and possible errors are displayed clearly.

### 3.5 Garage: bicycles and gadgets

The Garage is the personal area for cycling equipment.

**Bicycles** can be imported from Strava or entered manually, viewed, added, edited, synchronized and deleted. Possible fields are name, bicycle type, brand, model, weight, purchase date, ridden kilometers, image and note.

**Gadgets** are additional equipment such as bike computers, heart-rate monitors or sensors. Possible fields are name, category, brand, model, purchase date, description and image.

### 3.6 Body-Stats

The Body-Stats page lets users record and manage personal body data over time. Examples include measurement date, weight, body height, other personal values and an optional note. Multiple measurements are retained so that trends remain visible. Body-Stats are private data.

### 3.7 Events

The Events page lets users record notable events such as accidents, injuries, repairs, longer breaks, personal goals or other relevant incidents.

An Event contains at least a date, event type, title and description. Events can be created, viewed, edited and deleted. Relevant Events are included in the Dashboard's timeline overview.

### 3.8 Settings and language

Users can manage personal details and their preferred language. The central interfaces are available in German and English.

---

## 4. Roles and permissions

| Role | Description |
|---|---|
| User | Manages their own Activities, bicycles, gadgets, Body-Stats, Events and Dashboard data. |
| Administrator | Can manage user accounts and the local application. This role is optional and is not a central part of the core domain functions. |

| Function | User | Administrator |
|---|:---:|:---:|
| Register and log in | Yes | Yes |
| Manage own Activities | Yes | Yes |
| Connect and synchronize Strava | Yes | Yes |
| Manage own bicycles and gadgets | Yes | Yes |
| Manage own Body-Stats | Yes | Yes |
| Manage own Events | Yes | Yes |
| View own Dashboard | Yes | Yes |
| Manage all users | No | Optional |

Users may access only their own personal data. A public demo without a user account is not planned.

---

## 5. Use cases

### UC-01 Registration

A guest creates a personal account with the required details. After successful registration, they can log in.

### UC-02 Login

A registered user logs in and is taken directly to their personal Dashboard.

### UC-03 Display Dashboard

The Dashboard displays metrics, charts, activity trends and relevant Events for the logged-in user.

### UC-04 Connect and synchronize Strava

The user connects their Strava account and starts synchronization. New and updated cycling data is imported into Athlify.

### UC-05 Enter activity manually

The user enters the date, type, distance, duration and other details. The activity then appears in the list and analyses.

### UC-06 Edit or delete activity

The user opens an existing activity and edits available details or deletes the entry. The list and Dashboard are updated.

### UC-07 Manage Garage

The user creates, edits, synchronizes or deletes bicycles and gadgets in the Garage.

### UC-08 Manage Body-Stats

The user records, edits or deletes personal body measurements with a date.

### UC-09 Manage Event

The user enters the type, date, title and description of an Event. The Event appears on the Events page and in the Dashboard's timeline context.

---

## 6. User stories

| # | User story | Priority |
|---|---|:---:|
| 1 | As a user, I want to register and log in so that my data is assigned to me. | Must Have |
| 2 | As a user, I want to synchronize my Strava activities so that my training data is imported automatically. | Must Have |
| 3 | As a user, I want to create, edit and delete activities manually so that I can manage data without Strava. | Must Have |
| 4 | As a user, I want to see a visually appealing Dashboard with Track, Fitness and Body Metrics so that I can analyze my cycling data, training load and physical development. | Must Have |
| 5 | As a user, I want to manage bicycles in my Garage so that I can track their use. | Must Have |
| 6 | As a user, I want to manage gadgets in my Garage so that my cycling equipment is fully documented. | Should Have |
| 7 | As a user, I want to record and edit Body-Stats so that I can track personal development. | Should Have |
| 8 | As a user, I want to record Events such as accidents or repairs so that they appear in the timeline of my activities. | Should Have |
| 9 | As a user, I want to switch between German and English so that I can use the application in my preferred language. | Should Have |
| 10 | As an administrator, I want to manage users so that the local application can be administered. | Could Have |

Detailed acceptance criteria are documented in [`docs/concept/user_stories.md`](concept/user_stories.md).

---

## 7. Quality requirements

| Category | Functional requirement |
|---|---|
| Understandability | The most important functions can be found and used without technical knowledge. |
| Clarity | Activities, equipment, Body-Stats and Events are clearly separated. |
| Visualization | Track Metrics, Fitness Metrics and Body Metrics are displayed as clearly separated areas with understandable labels and charts. |
| Filtering | The user can filter Dashboard data by period, tags, activity type (Indoor/Outdoor) and bicycle. |
| Responsiveness | The application is practical to use on desktop, tablet and smartphone. |
| Accessible operation | Contrast, keyboard operation and understandable labels are considered. |
| Privacy | Personal training, body and Event data remains assigned to the respective user. |
| Reliability | Input is not discarded without feedback. Failed actions are explained clearly. |
| Consistency | The same terms and interaction patterns are used in all areas. |
| Multilingual support | The central functions are available in German and English. |

---

## 8. Wireframes

The wireframes show the domain views of the application. They do not prescribe a technical implementation.

### 8.1 Login

```text
┌───────────────────────────┐
│           Athlify         │
│  Welcome to Athlify       │
│  ┌─────────────────────┐  │
│  │ Email               │  │
│  └─────────────────────┘  │
│  ┌─────────────────────┐  │
│  │ Password            │  │
│  └─────────────────────┘  │
│        [ Login ]           │
│  No account yet?           │
│  [ Register now ]          │
└───────────────────────────┘
```

### 8.2 Dashboard

```text
┌────────────────────────────────────────────────────┐
│ Athlify  Dashboard | Activities | Garage | Stats    │
│                         | Events                    │
├────────────────────────────────────────────────────┤
│ Filter: [Period] [Tags] [Indoor/Outdoor] [Bicycle] │
├────────────────────────────────────────────────────┤
│ TRACK METRICS                                      │
│ [Distance] [Time] [Elevation] [TSS] [Speed]        │
├────────────────────────────────────────────────────┤
│ FITNESS METRICS                                    │
│ [Fitness / CTL] [Fatigue / ATL] [Form / TSB]       │
├────────────────────────────────────────────────────┤
│ BODY METRICS                                       │
│ [Weight] [Fat] [Muscle] [Water] [Bone]             │
├────────────────────────────────────────────────────┤
│ [Metric trends]              [Events / notices]     │
└────────────────────────────────────────────────────┘
```

### 8.3 Activities

```text
┌────────────────────────────────────────────────────┐
│ Activities                    [+ New] [Sync]        │
├────────────────────────────────────────────────────┤
│ Activities [+ New] [Strava Sync] [Merge]           │
├────────────────────────────────────────────────────┤
│ [List] [Calendar]                                   │
│ Date       Type      Distance  Duration  Source     │
│ 24.07.26   Road bike 42 km     1:15 h    Strava     │
│ 22.07.26   Indoor     8 km     0:40 h    Manual     │
└────────────────────────────────────────────────────┘
```

### 8.4 Activity detail and edit form

```text
┌────────────────────────────────────────────────────┐
│ Edit activity                           [Save]       │
├────────────────────────────────────────────────────┤
│ Date [____]       Type [Indoor/Outdoor ▼]           │
│ Bicycle [_______] Gadgets [________]               │
│ Time [____]       Distance [____]                  │
│ Average speed* [____]                              │
│ Elevation [____]   TSS* [____]                     │
│ Heart rate Min. [__] Max. [__] Avg. [__]            │
│ Mood [________]    Effort [____]                   │
│ Wind [________]    Tags [________]                 │
│ Description [_______________________________]       │
│ Some values are calculated automatically            │
└────────────────────────────────────────────────────┘
```

### 8.5 Activity calendar

The calendar view displays activities by week and summarizes at least distance, time, elevation gain and TSS per week. Individual activities can be opened directly from the calendar view.

### 8.4 Garage

```text
┌────────────────────────────────────────────────────┐
│ Garage                    [Bicycles] [Gadgets] [+]  │
├────────────────────────────────────────────────────┤
│ Road bike "Speedy"      1,240 km        [Edit]      │
│ Gravel bike "Trail"       580 km        [Edit]      │
│ Bike computer                           [Edit]      │
└────────────────────────────────────────────────────┘
```

### 8.5 Body-Stats and Events

```text
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ Body-Stats          [+ New]  │  │ Events              [+ New]  │
├──────────────────────────────┤  ├──────────────────────────────┤
│ Date    Weight   Height      │  │ Date    Type       Title       │
│ 01.08.  75.4 kg  180 cm     │  │ 15.07.  Accident   Fall        │
└──────────────────────────────┘  └──────────────────────────────┘
```

---

## 9. Roadmap

| Phase | Content |
|---|---|
| 1. Foundation | Login, navigation and basic user guidance |
| 2. Activities | Manual activities and activity-list management |
| 3. Strava | Connecting and synchronizing activities and bicycles |
| 4. Dashboard | Metrics, charts and timeline analyses |
| 5. Garage | Manage bicycles and gadgets |
| 6. Personal data | Integrate Body-Stats and Events |
| 7. Quality | Check usability, data ownership, multilingual support and error cases |

---

## 10. Risks and mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Limited time due to the two-person team | Not all functions will be implemented completely. | Prioritize core functions and handle optional extensions afterward. |
| Changes or restrictions at Strava | Synchronization may fail or be incomplete. | Offer manual entry as an equivalent alternative and display errors clearly. |
| Unclear or incomplete data | Dashboard analyses may be inaccurate. | Validate input and handle missing values transparently. |
| Incorrect data ownership | Personal data could appear for the wrong user. | Check user ownership for every personal function. |
| Scope that is too complex | Core functions will not be finished on time. | Review scope regularly and prioritize Must-Have functions. |
| Sensitive Body-Stats or Events | Users could lose trust in the application. | Show data only in the personal area and respect privacy. |

---

## 11. Technical detail documents

The following documents contain technical decisions and implementation details. They are intentionally separated from this functional concept:

- [Technology stack](concept/technology-stack.md)
- [Architecture](concept/architecture.md)
- [Data model](concept/data-model.md)
- [Activity management](concept/activity-management.md)
- [API design](concept/api-design.md)
- [Security requirements](concept/security.md)
- [Testing strategy and deployment](concept/testing-deployment.md)

---

## 12. Open questions

| # | Question | Significance |
|---|---|---|
| 1 | Which Body-Stats should be supported in the initial scope in addition to weight and height? | Affects the level of detail on the Body-Stats page. |
| 2 | Which Event types should be offered as a fixed set? | Affects Event selection and presentation. |
| 3 | Should Events only be displayed on the Dashboard or also linked directly to individual activities? | Affects the domain relationship between Events and activities. |
| 4 | Should the language already be switchable on the login page? | UX decision for the entry point. |
| 5 | Which charts are mandatory for academic assessment? | Helps prioritize Dashboard functions. |

---

*End of document – Functional software concept Athlify, version 1.7*
