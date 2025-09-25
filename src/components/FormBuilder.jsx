import React, { useState } from 'react'

function FormBuilder({ fields, onFieldsChange }) {
  const [editingField, setEditingField] = useState(null)
  const [isAddingField, setIsAddingField] = useState(false)
  const [fieldForm, setFieldForm] = useState({
    name: '',
    label: '',
    description: '',
    type: 'text',
    required: false,
    sendAs: 'body',
    placeholder: '',
    options: []
  })

  const fieldTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'email', label: 'Email' },
    { value: 'password', label: 'Password' },
    { value: 'number', label: 'Number' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'select', label: 'Select Dropdown' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'date', label: 'Date' },
    { value: 'url', label: 'URL' }
  ]

  const handleAddField = () => {
    setEditingField(null)
    setIsAddingField(true)
    setFieldForm({
      name: '',
      label: '',
      description: '',
      type: 'text',
      required: false,
      sendAs: 'body',
      placeholder: '',
      options: []
    })
  }

  const handleEditField = (field, index) => {
    setEditingField(index)
    setIsAddingField(false)
    setFieldForm({ ...field })
  }

  const handleSaveField = () => {
    if (!fieldForm.name || !fieldForm.label) {
      alert('Name and Label are required')
      return
    }

    const updatedFields = [...fields]

    if (editingField !== null) {
      updatedFields[editingField] = fieldForm
    } else {
      updatedFields.push(fieldForm)
    }

    onFieldsChange(updatedFields)
    setEditingField(null)
    setIsAddingField(false)
    setFieldForm({
      name: '',
      label: '',
      description: '',
      type: 'text',
      required: false,
      sendAs: 'body',
      placeholder: '',
      options: []
    })
  }

  const handleDeleteField = (index) => {
    if (confirm('Are you sure you want to delete this field?')) {
      const updatedFields = fields.filter((_, i) => i !== index)
      onFieldsChange(updatedFields)
    }
  }

  const handleCancel = () => {
    setEditingField(null)
    setIsAddingField(false)
    setFieldForm({
      name: '',
      label: '',
      description: '',
      type: 'text',
      required: false,
      sendAs: 'body',
      placeholder: '',
      options: []
    })
  }

  const handleFieldFormChange = (updates) => {
    setFieldForm(prev => ({ ...prev, ...updates }))
  }

  const handleOptionChange = (index, value) => {
    const newOptions = [...fieldForm.options]
    newOptions[index] = { ...newOptions[index], ...value }
    setFieldForm(prev => ({ ...prev, options: newOptions }))
  }

  const addOption = () => {
    setFieldForm(prev => ({
      ...prev,
      options: [...prev.options, { value: '', label: '' }]
    }))
  }

  const removeOption = (index) => {
    setFieldForm(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-white">Form Fields</h2>
        <button
          onClick={handleAddField}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          Add Field
        </button>
      </div>

      {/* Field Configuration Form */}
      {(editingField !== null || isAddingField) && (
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-md font-medium text-white mb-4">
            {editingField !== null ? 'Edit Field' : 'New Field'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Field Name *
              </label>
              <input
                type="text"
                value={fieldForm.name}
                onChange={(e) => handleFieldFormChange({ name: e.target.value })}
                placeholder="field_name"
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Field Label *
              </label>
              <input
                type="text"
                value={fieldForm.label}
                onChange={(e) => handleFieldFormChange({ label: e.target.value })}
                placeholder="Field Label"
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Field Type
              </label>
              <select
                value={fieldForm.type}
                onChange={(e) => handleFieldFormChange({ type: e.target.value })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {fieldTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Send As
              </label>
              <select
                value={fieldForm.sendAs}
                onChange={(e) => handleFieldFormChange({ sendAs: e.target.value })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="body">Request Body (JSON)</option>
                <option value="query">Query Parameter</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Placeholder
              </label>
              <input
                type="text"
                value={fieldForm.placeholder}
                onChange={(e) => handleFieldFormChange({ placeholder: e.target.value })}
                placeholder="Enter placeholder text"
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={fieldForm.required}
                  onChange={(e) => handleFieldFormChange({ required: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-white">Required</span>
              </label>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-white mb-2">
              Description
            </label>
            <textarea
              value={fieldForm.description}
              onChange={(e) => handleFieldFormChange({ description: e.target.value })}
              placeholder="Enter field description"
              rows={3}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Options for select fields */}
          {fieldForm.type === 'select' && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-white">
                  Select Options
                </label>
                <button
                  type="button"
                  onClick={addOption}
                  className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                >
                  Add Option
                </button>
              </div>

              {fieldForm.options.map((option, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Value"
                    value={option.value}
                    onChange={(e) => handleOptionChange(index, { value: e.target.value })}
                    className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Label"
                    value={option.label}
                    onChange={(e) => handleOptionChange(index, { label: e.target.value })}
                    className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="px-2 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveField}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              {editingField !== null ? 'Update' : 'Add'} Field
            </button>
          </div>
        </div>
      )}

      {/* Fields List */}
      <div className="space-y-2">
        {fields.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No fields added yet. Click "Add Field" to get started.</p>
        ) : (
          fields.map((field, index) => (
            <div key={index} className="bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-white">{field.label}</h4>
                    <span className="text-xs bg-gray-600 px-2 py-1 rounded text-gray-300">
                      {field.type || 'text'}
                    </span>
                    {field.required && (
                      <span className="text-xs bg-red-600 px-2 py-1 rounded text-white">
                        Required
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded ${
                      field.sendAs === 'query'
                        ? 'bg-blue-600 text-white'
                        : 'bg-green-600 text-white'
                    }`}>
                      {field.sendAs === 'query' ? 'Query' : 'Body'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-400 mb-2">{field.description}</p>

                  {field.type === 'select' && field.options && (
                    <div className="text-xs text-gray-500">
                      Options: {field.options.map(opt => opt.label).join(', ')}
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Name: {field.name}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditField(field, index)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteField(index)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default FormBuilder