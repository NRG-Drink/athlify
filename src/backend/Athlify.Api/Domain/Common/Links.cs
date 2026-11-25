using Microsoft.EntityFrameworkCore;

namespace Athlify.Api.Domain.Common;

/// <summary>Resolves and replaces the links of a record (tags, gadgets, vehicles).</summary>
public static class Links
{
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
