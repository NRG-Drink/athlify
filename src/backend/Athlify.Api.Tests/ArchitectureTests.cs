using System.Reflection;
using Athlify.Api.Domain.Common;
using HotChocolate.Types.Relay;

namespace Athlify.Api.Tests;

/// <summary>
/// Entities are plain domain classes. How the API shows them (node, hidden fields, filters) is configured in
/// the <c>…ObjectType</c> classes next to them.
/// </summary>
public class ArchitectureTests
{
    private static readonly Type[] EntityTypes = typeof(Entity).Assembly
        .GetTypes()
        .Where(t => typeof(Entity).IsAssignableFrom(t) && !t.IsAbstract)
        .Concat([typeof(Entity), typeof(Equipment)])
        .ToArray();

    [Test]
    public async Task EntitiesCarryNoApiAttributes()
    {
        var offenders = new List<string>();
        foreach (var type in EntityTypes)
        {
            Collect(type, type.GetCustomAttributes(false), offenders);
            foreach (var member in type.GetMembers(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
            {
                // The one deliberate exception: [ID] on Entity.Id (see the comment there).
                var attributes = type == typeof(Entity) && member.Name == nameof(Entity.Id)
                    ? member.GetCustomAttributes(false).Where(a => a is not IDAttribute)
                    : member.GetCustomAttributes(false);
                Collect(type, attributes, offenders, member.Name);
            }
        }

        await Assert.That(offenders).IsEmpty();
    }

    [Test]
    public async Task EntityTypesAreFound()
    {
        await Assert.That(EntityTypes.Length).IsGreaterThan(10);
    }

    private static void Collect(Type type, IEnumerable<object> attributes, List<string> offenders, string? member = null)
    {
        foreach (var attribute in attributes)
        {
            if (attribute.GetType().Namespace?.StartsWith("HotChocolate", StringComparison.Ordinal) == true)
            {
                offenders.Add($"{type.Name}{(member is null ? "" : "." + member)}: {attribute.GetType().Name}");
            }
        }
    }
}
