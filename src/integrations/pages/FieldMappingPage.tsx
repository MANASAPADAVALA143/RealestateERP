import { useState } from "react";
import { categories, categoryById } from "@/integrations/engine/categories";
import type { CategoryId, MappingTemplate } from "@/integrations/engine/types";
import { Button, Empty, IntegrationPage, Section, fmtDateTime, inputClass } from "@/integrations/ui/components";
import { download, integrationService, useAsync, useWorkspace } from "@/integrations/ui/hooks";

export function FieldMappingPage() {
  const workspace = useWorkspace();
  const tenantId = workspace?.tenantId;
  const templates = useAsync(async () => (tenantId ? integrationService.templates(tenantId) : ([] as MappingTemplate[])), [tenantId]).data ?? [];
  const [editing, setEditing] = useState<MappingTemplate | null>(null);
  const [dictionary, setDictionary] = useState<CategoryId>("gl_transactions");
  const dictionaryCategory = categoryById(dictionary);

  return (
    <IntegrationPage title="Field Mapping" subtitle="Saved mapping templates and customer profiles. Different column names can map to the same EstateCFO field, and every change is written to the audit trail.">
      <Section title="Saved mapping templates" subtitle="Templates are created in the import wizard and reused automatically when a file’s headers match.">
        {templates.length === 0 ? (
          <Empty>No templates saved yet. Map a file in the import wizard, then choose “Save mapping template”.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th>Template</th>
                  <th>Profile</th>
                  <th>Category</th>
                  <th>Mapped fields</th>
                  <th>Customer aliases</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td className="font-semibold">{template.name}</td>
                    <td>{template.profile}</td>
                    <td>{categoryById(template.category).label}</td>
                    <td>{Object.keys(template.mapping).length}</td>
                    <td>{Object.values(template.aliases).flat().length}</td>
                    <td>{fmtDateTime(template.updatedAt)}</td>
                    <td>
                      <div className="flex gap-2">
                        <Button onClick={() => setEditing(structuredClone(template))}>Edit</Button>
                        <Button onClick={() => download(`${template.name}.mapping.json`, JSON.stringify(template, null, 2), "application/json")}>Export</Button>
                        <Button danger onClick={() => tenantId && integrationService.deleteTemplate(tenantId, template.id)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {editing ? (
        <Section
          title={`Edit: ${editing.name}`}
          subtitle={`${categoryById(editing.category).label} · profile ${editing.profile}. Enter the exact column header for each field, and any other headers this customer uses for it.`}
          actions={
            <div className="flex gap-2">
              <Button onClick={() => setEditing(null)}>Cancel</Button>
              <Button
                primary
                onClick={async () => {
                  const { id, tenantId: owner, name, profile, category, headers, mapping, dateOrder, aliases } = editing;
                  await integrationService.saveTemplate({ id, tenantId: owner, name, profile, category, headers, mapping, dateOrder, aliases });
                  setEditing(null);
                }}
              >
                Save changes
              </Button>
            </div>
          }
        >
          <div className="mb-4 flex flex-wrap gap-3">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
              Name
              <input className={`${inputClass} mt-1 block`} value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
              Profile
              <input className={`${inputClass} mt-1 block`} value={editing.profile} onChange={(event) => setEditing({ ...editing, profile: event.target.value })} />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table min-w-[820px]">
              <thead>
                <tr>
                  <th>EstateCFO field</th>
                  <th>Source column header</th>
                  <th>Other headers for this customer (comma separated)</th>
                </tr>
              </thead>
              <tbody>
                {categoryById(editing.category).fields.map((field) => (
                  <tr key={field.key}>
                    <td>
                      <b>{field.label}</b>
                      {field.required ? <span className="ml-1 text-red-700">*</span> : null}
                    </td>
                    <td>
                      <input
                        aria-label={`Header for ${field.label}`}
                        className={inputClass}
                        value={editing.mapping[field.key] ?? ""}
                        onChange={(event) => {
                          const mapping = { ...editing.mapping };
                          if (event.target.value) mapping[field.key] = event.target.value;
                          else delete mapping[field.key];
                          setEditing({ ...editing, mapping });
                        }}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Aliases for ${field.label}`}
                        className={`${inputClass} w-full`}
                        value={(editing.aliases[field.key] ?? []).join(", ")}
                        onChange={(event) => setEditing({ ...editing, aliases: { ...editing.aliases, [field.key]: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) } })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      <Section
        title="Built-in column dictionary"
        subtitle="Column names the mapper recognises before any customer profile is applied. Suggestions still need your confirmation in the wizard."
        actions={
          <select aria-label="Dictionary category" className={inputClass} value={dictionary} onChange={(event) => setDictionary(event.target.value as CategoryId)}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.label}</option>
            ))}
          </select>
        }
      >
        <div className="overflow-x-auto">
          <table className="data-table min-w-[820px]">
            <thead>
              <tr>
                <th>EstateCFO field</th>
                <th>Type</th>
                <th>Required</th>
                <th>Recognised source columns</th>
              </tr>
            </thead>
            <tbody>
              {dictionaryCategory.fields.map((field) => (
                <tr key={field.key}>
                  <td><b>{field.key}</b> <span className="text-navy/50">· {field.label}</span></td>
                  <td>{field.type}{field.options ? ` (${field.options.join(" / ")})` : ""}</td>
                  <td>{field.required ? "Yes" : "No"}</td>
                  <td className="text-sm">{field.synonyms.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </IntegrationPage>
  );
}
