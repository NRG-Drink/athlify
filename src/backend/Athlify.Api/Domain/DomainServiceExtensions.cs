using Athlify.Api.Database;
using Athlify.Api.Domain.Activities;
using Athlify.Api.Domain.Body;
using Athlify.Api.Domain.Common;
using Athlify.Api.Domain.Events;
using Athlify.Api.Domain.Gadgets;
using Athlify.Api.Domain.Tags;
using Athlify.Api.Domain.Vehicles;

namespace Athlify.Api.Domain;

public static class DomainServiceExtensions
{
    public static WebApplicationBuilder AddDomainServices(this WebApplicationBuilder builder)
    {
        builder.Services
            .AddSingleton<ActivityValidation>()
            .AddSingleton<MergeMembership>()
            .AddSingleton<DbSeeder>()
            .AddSingleton<BodyStatsValidation>()
            .AddSingleton<EventValidation>()
            .AddSingleton<EquipmentValidation>()
            .AddSingleton<TagValidation>()
            .AddSingleton<MaintenanceCycleValidation>()
            .AddScoped<ActivityNode>()
            .AddScoped<ActivityMergeNode>()
            .AddScoped<ActivityMutation>()
            .AddScoped<ActivityQuery>()
            .AddScoped<ActivityMergeMutation>()
            .AddScoped<ActivityMergeQuery>()
            .AddScoped<BodyStatsNode>()
            .AddScoped<BodyStatsMutation>()
            .AddScoped<BodyStatsQuery>()
            .AddScoped<EventNode>()
            .AddScoped<EventQuery>()
            .AddScoped<EventMutation>()
            .AddScoped<GadgetNode>()
            .AddScoped<GadgetQuery>()
            .AddScoped<GadgetMutation>()
            .AddScoped<TagNode>()
            .AddScoped<TagQuery>()
            .AddScoped<TagMutation>()
            .AddScoped<MaintenanceCycleNode>()
            .AddScoped<MaintenanceCycleMutation>()
            .AddScoped<VehicleNode>()
            .AddScoped<VehicleQuery>()
            .AddScoped<VehicleMutation>();

        return builder;
    }
}
