using Aspire.Hosting.Eventing;
using System.Diagnostics;

namespace Athlify.AppHost;

public static class IDistributedApplicationEventingExtensions
{
    /// <summary>
    /// Opens the specified resource in the default web browser after the resources have been created.
    /// </summary>
    public static IDistributedApplicationBuilder OpenInBrowserAfterCreated(
        this IDistributedApplicationBuilder builder,
        string name,
        bool isExecuted = true)
    {
        if (!isExecuted)
        {
            return builder;
        }

        builder.Eventing.Subscribe<AfterResourcesCreatedEvent>((eve, cancellationToken) =>
        {
            var frontend = eve.Model.Resources
                .OfType<IResourceWithEndpoints>()
                .FirstOrDefault(r => r.Name == name);
            var endpoint = frontend?.GetEndpoint("http");
            if (endpoint is { IsAllocated: true } && Uri.TryCreate(endpoint.Url, UriKind.Absolute, out var url))
            {
                Process.Start(new ProcessStartInfo(url.ToString()) { UseShellExecute = true });
            }

            return Task.CompletedTask;
        });

        return builder;
    }
}
