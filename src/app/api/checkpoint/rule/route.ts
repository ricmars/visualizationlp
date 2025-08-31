import { NextRequest, NextResponse } from "next/server";
import { pool } from "../../../lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("ruleId");
    const table = searchParams.get("table");

    if (!ruleId || !table) {
      return NextResponse.json(
        { error: "ruleId and table parameters are required" },
        { status: 400 },
      );
    }

    // Extract the actual database ID from the rule ID
    // Rule ID format: `${checkpoint.id}-${table}-${id}`
    // Checkpoint ID is a UUID with hyphens, so we need to handle this carefully
    const lastDashIndex = ruleId.lastIndexOf("-");
    if (lastDashIndex === -1) {
      return NextResponse.json(
        { error: "Invalid rule ID format" },
        { status: 400 },
      );
    }

    const dbId = parseInt(ruleId.substring(lastDashIndex + 1)); // Last part after the last dash
    if (isNaN(dbId)) {
      return NextResponse.json(
        { error: "Invalid database ID in rule ID" },
        { status: 400 },
      );
    }

    // Fetch the rule data based on the table
    let query = "";
    let values: any[] = [];

    switch (table) {
      case "Fields":
        query = `SELECT * FROM "Fields" WHERE id = $1`;
        values = [dbId];
        break;
      case "Views":
        query = `SELECT * FROM "Views" WHERE id = $1`;
        values = [dbId];
        break;
      case "Cases":
        query = `SELECT * FROM "Cases" WHERE id = $1`;
        values = [dbId];
        break;
      case "Applications":
        query = `SELECT * FROM "Applications" WHERE id = $1`;
        values = [dbId];
        break;
      default:
        return NextResponse.json(
          { error: "Unsupported table" },
          { status: 400 },
        );
    }

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const ruleData = result.rows[0];

    // Transform the data based on the table type
    let transformedData: any = { ...ruleData };

    switch (table) {
      case "Fields":
        // For fields, ensure we have the expected structure
        transformedData = {
          id: ruleData.id,
          name: ruleData.name,
          label: ruleData.name, // Field modals expect 'label'
          type: ruleData.type,
          primary: ruleData.primary || false,
          required: ruleData.required || false,
          options: ruleData.options,
          sampleValue: ruleData.sample_value,
          caseid: ruleData.caseid,
        };
        break;
      case "Views":
        // For views, parse the model if it's a string
        transformedData = {
          id: ruleData.id,
          name: ruleData.name,
          model:
            typeof ruleData.model === "string"
              ? JSON.parse(ruleData.model)
              : ruleData.model,
          caseid: ruleData.caseid,
        };
        break;
      case "Cases":
        // For cases/workflows, ensure we have name and description
        transformedData = {
          id: ruleData.id,
          name: ruleData.name,
          description: ruleData.description,
          model:
            typeof ruleData.model === "string"
              ? JSON.parse(ruleData.model)
              : ruleData.model,
        };
        break;
      case "Applications":
        // For applications, ensure we have name and description
        transformedData = {
          id: ruleData.id,
          name: ruleData.name,
          description: ruleData.description,
        };
        break;
    }

    return NextResponse.json({
      success: true,
      data: transformedData,
      table,
      ruleId,
    });
  } catch (error) {
    console.error("Error fetching rule data:", error);
    return NextResponse.json(
      { error: "Failed to fetch rule data" },
      { status: 500 },
    );
  }
}
