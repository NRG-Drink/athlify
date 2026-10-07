using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Athlify.Api.Database.Migrations
{
    /// <inheritdoc />
    public partial class InitialDomainModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: true),
                    FirstName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Language = table.Column<string>(type: "text", nullable: false),
                    Role = table.Column<string>(type: "text", nullable: false),
                    Uid = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ActivityMerges",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    TotalTime = table.Column<int>(type: "integer", nullable: false),
                    TotalDistance = table.Column<double>(type: "double precision", nullable: false),
                    TotalElevationGain = table.Column<double>(type: "double precision", nullable: true),
                    TotalTss = table.Column<double>(type: "double precision", nullable: true),
                    Uid = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActivityMerges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ActivityMerges_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BodyStats",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Weight = table.Column<double>(type: "double precision", nullable: false),
                    BodyFatPercentage = table.Column<double>(type: "double precision", nullable: false),
                    MusclePercentage = table.Column<double>(type: "double precision", nullable: false),
                    WaterPercentage = table.Column<double>(type: "double precision", nullable: false),
                    BoneMass = table.Column<double>(type: "double precision", nullable: false),
                    Uid = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BodyStats", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BodyStats_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Events",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Uid = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Events", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Events_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Gadgets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Brand = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Model = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Nickname = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PurchaseDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    DeactivationDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Price = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    Source = table.Column<string>(type: "text", nullable: false),
                    Uid = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Gadgets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Gadgets_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Tags",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    NormalizedName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Uid = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tags", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Tags_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Vehicles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Brand = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Model = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Nickname = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PurchaseDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    DeactivationDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Price = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    Source = table.Column<string>(type: "text", nullable: false),
                    StravaGearId = table.Column<string>(type: "text", nullable: true),
                    Uid = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vehicles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Vehicles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Comments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Content = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    BodyStatsId = table.Column<int>(type: "integer", nullable: false),
                    Uid = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Comments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Comments_BodyStats_BodyStatsId",
                        column: x => x.BodyStatsId,
                        principalTable: "BodyStats",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EventTags",
                columns: table => new
                {
                    EventsId = table.Column<int>(type: "integer", nullable: false),
                    TagsId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventTags", x => new { x.EventsId, x.TagsId });
                    table.ForeignKey(
                        name: "FK_EventTags_Events_EventsId",
                        column: x => x.EventsId,
                        principalTable: "Events",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EventTags_Tags_TagsId",
                        column: x => x.TagsId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GadgetTags",
                columns: table => new
                {
                    GadgetsId = table.Column<int>(type: "integer", nullable: false),
                    TagsId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GadgetTags", x => new { x.GadgetsId, x.TagsId });
                    table.ForeignKey(
                        name: "FK_GadgetTags_Gadgets_GadgetsId",
                        column: x => x.GadgetsId,
                        principalTable: "Gadgets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GadgetTags_Tags_TagsId",
                        column: x => x.TagsId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Activities",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Time = table.Column<int>(type: "integer", nullable: false),
                    Distance = table.Column<double>(type: "double precision", nullable: false),
                    AverageSpeed = table.Column<double>(type: "double precision", nullable: true),
                    ElevationGain = table.Column<double>(type: "double precision", nullable: true),
                    Tss = table.Column<double>(type: "double precision", nullable: true),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    HeartRateMin = table.Column<int>(type: "integer", nullable: true),
                    HeartRateMax = table.Column<int>(type: "integer", nullable: true),
                    HeartRateAverage = table.Column<int>(type: "integer", nullable: true),
                    Mood = table.Column<string>(type: "text", nullable: true),
                    Effort = table.Column<int>(type: "integer", nullable: true),
                    Wind = table.Column<string>(type: "text", nullable: true),
                    Source = table.Column<string>(type: "text", nullable: false),
                    StravaActivityId = table.Column<long>(type: "bigint", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    VehicleId = table.Column<int>(type: "integer", nullable: true),
                    MergeId = table.Column<int>(type: "integer", nullable: true),
                    Uid = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Activities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Activities_ActivityMerges_MergeId",
                        column: x => x.MergeId,
                        principalTable: "ActivityMerges",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Activities_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Activities_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "MaintenanceCycles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    VehicleId = table.Column<int>(type: "integer", nullable: true),
                    GadgetId = table.Column<int>(type: "integer", nullable: true),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IntervalDistance = table.Column<double>(type: "double precision", nullable: true),
                    IntervalDays = table.Column<int>(type: "integer", nullable: true),
                    LastServiceDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    Uid = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaintenanceCycles", x => x.Id);
                    table.CheckConstraint("CK_MaintenanceCycles_ExactlyOneParent", "(\"VehicleId\" IS NULL) <> (\"GadgetId\" IS NULL)");
                    table.ForeignKey(
                        name: "FK_MaintenanceCycles_Gadgets_GadgetId",
                        column: x => x.GadgetId,
                        principalTable: "Gadgets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MaintenanceCycles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MaintenanceCycles_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VehicleGadgets",
                columns: table => new
                {
                    GadgetsId = table.Column<int>(type: "integer", nullable: false),
                    VehiclesId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleGadgets", x => new { x.GadgetsId, x.VehiclesId });
                    table.ForeignKey(
                        name: "FK_VehicleGadgets_Gadgets_GadgetsId",
                        column: x => x.GadgetsId,
                        principalTable: "Gadgets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VehicleGadgets_Vehicles_VehiclesId",
                        column: x => x.VehiclesId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VehicleTags",
                columns: table => new
                {
                    TagsId = table.Column<int>(type: "integer", nullable: false),
                    VehiclesId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleTags", x => new { x.TagsId, x.VehiclesId });
                    table.ForeignKey(
                        name: "FK_VehicleTags_Tags_TagsId",
                        column: x => x.TagsId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VehicleTags_Vehicles_VehiclesId",
                        column: x => x.VehiclesId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ActivityGadgets",
                columns: table => new
                {
                    ActivitiesId = table.Column<int>(type: "integer", nullable: false),
                    GadgetsId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActivityGadgets", x => new { x.ActivitiesId, x.GadgetsId });
                    table.ForeignKey(
                        name: "FK_ActivityGadgets_Activities_ActivitiesId",
                        column: x => x.ActivitiesId,
                        principalTable: "Activities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ActivityGadgets_Gadgets_GadgetsId",
                        column: x => x.GadgetsId,
                        principalTable: "Gadgets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ActivityTags",
                columns: table => new
                {
                    ActivitiesId = table.Column<int>(type: "integer", nullable: false),
                    TagsId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActivityTags", x => new { x.ActivitiesId, x.TagsId });
                    table.ForeignKey(
                        name: "FK_ActivityTags_Activities_ActivitiesId",
                        column: x => x.ActivitiesId,
                        principalTable: "Activities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ActivityTags_Tags_TagsId",
                        column: x => x.TagsId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Activities_MergeId",
                table: "Activities",
                column: "MergeId");

            migrationBuilder.CreateIndex(
                name: "IX_Activities_Uid",
                table: "Activities",
                column: "Uid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Activities_UserId_Date",
                table: "Activities",
                columns: new[] { "UserId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Activities_UserId_StravaActivityId",
                table: "Activities",
                columns: new[] { "UserId", "StravaActivityId" },
                unique: true,
                filter: "\"StravaActivityId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Activities_VehicleId",
                table: "Activities",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityGadgets_GadgetsId",
                table: "ActivityGadgets",
                column: "GadgetsId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityMerges_Uid",
                table: "ActivityMerges",
                column: "Uid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ActivityMerges_UserId",
                table: "ActivityMerges",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityTags_TagsId",
                table: "ActivityTags",
                column: "TagsId");

            migrationBuilder.CreateIndex(
                name: "IX_BodyStats_Uid",
                table: "BodyStats",
                column: "Uid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BodyStats_UserId_Date",
                table: "BodyStats",
                columns: new[] { "UserId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_Comments_BodyStatsId",
                table: "Comments",
                column: "BodyStatsId");

            migrationBuilder.CreateIndex(
                name: "IX_Comments_Uid",
                table: "Comments",
                column: "Uid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Events_Uid",
                table: "Events",
                column: "Uid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Events_UserId_StartDate",
                table: "Events",
                columns: new[] { "UserId", "StartDate" });

            migrationBuilder.CreateIndex(
                name: "IX_EventTags_TagsId",
                table: "EventTags",
                column: "TagsId");

            migrationBuilder.CreateIndex(
                name: "IX_Gadgets_Uid",
                table: "Gadgets",
                column: "Uid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Gadgets_UserId",
                table: "Gadgets",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_GadgetTags_TagsId",
                table: "GadgetTags",
                column: "TagsId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceCycles_GadgetId",
                table: "MaintenanceCycles",
                column: "GadgetId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceCycles_Uid",
                table: "MaintenanceCycles",
                column: "Uid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceCycles_UserId",
                table: "MaintenanceCycles",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceCycles_VehicleId",
                table: "MaintenanceCycles",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_Tags_Uid",
                table: "Tags",
                column: "Uid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tags_UserId_NormalizedName",
                table: "Tags",
                columns: new[] { "UserId", "NormalizedName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Uid",
                table: "Users",
                column: "Uid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VehicleGadgets_VehiclesId",
                table: "VehicleGadgets",
                column: "VehiclesId");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_Uid",
                table: "Vehicles",
                column: "Uid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_UserId_StravaGearId",
                table: "Vehicles",
                columns: new[] { "UserId", "StravaGearId" },
                unique: true,
                filter: "\"StravaGearId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleTags_VehiclesId",
                table: "VehicleTags",
                column: "VehiclesId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActivityGadgets");

            migrationBuilder.DropTable(
                name: "ActivityTags");

            migrationBuilder.DropTable(
                name: "Comments");

            migrationBuilder.DropTable(
                name: "EventTags");

            migrationBuilder.DropTable(
                name: "GadgetTags");

            migrationBuilder.DropTable(
                name: "MaintenanceCycles");

            migrationBuilder.DropTable(
                name: "VehicleGadgets");

            migrationBuilder.DropTable(
                name: "VehicleTags");

            migrationBuilder.DropTable(
                name: "Activities");

            migrationBuilder.DropTable(
                name: "BodyStats");

            migrationBuilder.DropTable(
                name: "Events");

            migrationBuilder.DropTable(
                name: "Gadgets");

            migrationBuilder.DropTable(
                name: "Tags");

            migrationBuilder.DropTable(
                name: "ActivityMerges");

            migrationBuilder.DropTable(
                name: "Vehicles");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
