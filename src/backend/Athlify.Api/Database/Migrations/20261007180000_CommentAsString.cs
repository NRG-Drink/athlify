using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Athlify.Api.Database.Migrations
{
    /// <inheritdoc />
    public partial class CommentAsString : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Comment",
                table: "BodyStats",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            // Keep the first note of each entry; the product only ever had one.
            migrationBuilder.Sql("""
                UPDATE "BodyStats" b
                SET "Comment" = (
                    SELECT c."Content" FROM "Comments" c
                    WHERE c."BodyStatsId" = b."Id"
                    ORDER BY c."Id" LIMIT 1);
                """);

            migrationBuilder.DropTable(
                name: "Comments");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
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

            migrationBuilder.Sql("""
                INSERT INTO "Comments" ("Content", "BodyStatsId", "Uid", "CreatedAt", "ModifiedAt")
                SELECT "Comment", "Id", gen_random_uuid(), "CreatedAt", "ModifiedAt"
                FROM "BodyStats" WHERE "Comment" IS NOT NULL;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Comments_BodyStatsId",
                table: "Comments",
                column: "BodyStatsId");

            migrationBuilder.CreateIndex(
                name: "IX_Comments_Uid",
                table: "Comments",
                column: "Uid",
                unique: true);

            migrationBuilder.DropColumn(
                name: "Comment",
                table: "BodyStats");
        }
    }
}
