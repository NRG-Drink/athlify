namespace Athlify.Build.Common;

/// <summary>
/// RIDs according to https://learn.microsoft.com/en-us/dotnet/core/rid-catalog#known-rids
/// </summary>
public static class DotNetRidCatalog
{
    public class Windows
    {
        public static readonly string WinX86 = "win-x86";
        public static readonly string WinX64 = "win-x64";
        public static readonly string WinArm64 = "win-arm64";
    }

    public class Linux
    {
        public static readonly string LinuxX64 = "linux-x64";
        public static readonly string LinuxAlpineX64 = "linux-musl-x64";
        public static readonly string LinuxAlpineArm64 = "linux-musl-arm64";
        public static readonly string LinuxArm = "linux-arm";
        public static readonly string LinuxArm64 = "linux-arm64";
        public static readonly string LinuxBionicArm64 = "linux-bionic-arm64";
        public static readonly string LinuxLongArch64 = "linux-longarch64";
    }

    public class MacOS
    {
        public static readonly string Osx = "osx";
        public static readonly string OsxX64 = "osx-x64";
        public static readonly string OsxArm64 = "osx-arm64";
    }
}
