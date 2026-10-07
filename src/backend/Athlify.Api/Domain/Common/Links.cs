using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Common;

/// <summary>Resolves and replaces the links of a record (tags, gadgets, vehicles).</summary>
public static class Links
{
    /// <summary>
    /// Loads every id from <paramref name="source"/>. The owner query filter hides other users' records, so an
    /// unknown id and a foreign id are both rejected with <c>VALIDATION_ERROR</c>; this is how links stay
    /// within one owner. Duplicate ids are ignored.
    /// </summary>
    public static async Task<List<T>> LoadAllAsync<T>(
        IQueryable<T> source,
        IEnumerable<int> ids,
        string label,
        CancellationToken cancellationToken)
        where T : Entity
    {
        var distinct = ids.Distinct().ToList();
        if (distinct.Count == 0)
        {
            return [];
        }

        var found = await source.Where(e => distinct.Contains(e.Id)).ToListAsync(cancellationToken);
        if (found.Count != distinct.Count)
        {
            throw DomainErrors.Validation($"{label} not found.");
        }

        return found;
    }

    /// <summary>Loads one optional link; see <see cref="LoadAllAsync{T}"/>.</summary>
    public static async Task<T?> LoadOptionalAsync<T>(
        IQueryable<T> source,
        int? id,
        string label,
        CancellationToken cancellationToken)
        where T : Entity
    {
        if (id is null)
        {
            return null;
        }

        return await source.FirstOrDefaultAsync(e => e.Id == id, cancellationToken)
            ?? throw DomainErrors.Validation($"{label} not found.");
    }

    /// <summary>Makes <paramref name="current"/> equal to <paramref name="desired"/>, keeping links that stay.</summary>
    public static void ReplaceWith<T>(ICollection<T> current, IReadOnlyCollection<T> desired)
        where T : Entity
    {
        var desiredIds = desired.Select(d => d.Id).ToHashSet();
        foreach (var removed in current.Where(c => !desiredIds.Contains(c.Id)).ToList())
        {
            current.Remove(removed);
        }

        var currentIds = current.Select(c => c.Id).ToHashSet();
        foreach (var added in desired.Where(d => !currentIds.Contains(d.Id)))
        {
            current.Add(added);
        }
    }
}
