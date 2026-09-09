using Athlify.Api.Models;

namespace Athlify.Api.Queries;

[QueryType]
public static partial class BodyStatsQuery
{
    public static BodyStats SetBodyStats(BodyStats bodyStats)
    {
        // In a real application, you would save the bodyStats to a database here.
        // For demonstration purposes, we will just return the provided bodyStats.
        return bodyStats;
    }

    public static IEnumerable<Models.BodyStats> GetBodyStatsTest()
    {
        // Sample data for demonstration purposes
        return
        [
            new()
            {
                Id = 1,
                Uid = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow,
                ModifiedAt = DateTime.UtcNow,
                Date = DateTime.UtcNow.Date,
                Weight = 70.5,
                BodyFatPercentage = 15.2,
                MusclePercentage = 40.0,
                WaterPercentage = 60.0,
                BoneMass = 3.5,
                Comments = new List<Models.Comment>
                {
                    new()
                    {
                        Id = 1,
                        Uid = Guid.NewGuid(),
                        CreatedAt = DateTime.UtcNow,
                        ModifiedAt = DateTime.UtcNow,
                        Content = "Feeling great!"
                    }
                }
            }
        ];
    }
}

/*
## Query:
query BodyStats($bodystat : BodyStatsInput!) {
  bodyStatsTest {
    date
    weight
    comments {
      content
    }
  }
  setBodyStats(bodyStats: $bodystat) {
    id
    uid
    date
    createdAt
    comments {
      id
      content
    }
  }
}

## Variables:
"bodystat": {
    "id": 123,
    "uid": "55367eed-cc04-4a82-a8c4-16d6729bbf34",
    "createdAt": "2026-09-09T00:00:00.5Z",
    "modifiedAt": "2026-09-09T00:00:00.5Z",
    "date": "2026-09-09T00:00:00.5Z",
    "weight": 66.6,
    "bodyFatPercentage": 9.99,
    "musclePercentage": 42.2,
    "waterPercentage": 39.1,
    "boneMass": 3.2,
    "comments": [
      {
        "id": 1123,
        "uid": "55367eed-cc04-4a82-a8c4-16d6729bbf34",
        "createdAt": "2026-09-09T00:00:00.5Z",
        "modifiedAt": "2026-09-09T00:00:00.5Z",
        "content": "Hello World!!"
      }
    ]
}

## Result:
{
  "data": {
    "bodyStatsTest": [
      {
        "date": "2026-09-09T00:00:00Z",
        "weight": 70.5,
        "comments": [
          {
            "content": "Feeling great!"
          }
        ]
      }
    ],
    "setBodyStats": {
      "id": 123,
      "uid": "55367eed-cc04-4a82-a8c4-16d6729bbf34",
      "date": "2026-09-09T00:00:00.5Z",
      "createdAt": "2026-09-09T00:00:00.5Z",
      "comments": [
        {
          "id": 1123,
          "content": "Hello World!!"
        }
      ]
    }
  }
}
 */
